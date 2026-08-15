package com.my.billiards.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import io.micrometer.context.ContextExecutorService;
import io.micrometer.context.ContextRegistry;
import io.micrometer.context.ContextSnapshotFactory;
import io.micrometer.context.integration.Slf4jThreadLocalAccessor;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationHandler;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.contextpropagation.ObservationThreadLocalAccessor;
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class AiProviderResilienceTest {

	private ExecutorService executorService;
	private CircuitBreakerRegistry circuitBreakerRegistry;
	private ObservationRegistry observationRegistry;
	private AiProviderResilience resilience;

	@BeforeEach
	void setUp() {
		observationRegistry = ObservationRegistry.create();
		observationRegistry.observationConfig().observationHandler(new ObservationHandler<>() {
			@Override
			public boolean supportsContext(Observation.Context context) {
				return true;
			}
		});
		ContextRegistry contextRegistry = new ContextRegistry()
			.registerThreadLocalAccessor(new ObservationThreadLocalAccessor(observationRegistry))
			.registerThreadLocalAccessor(new Slf4jThreadLocalAccessor("requestId"));
		ContextSnapshotFactory snapshotFactory = ContextSnapshotFactory.builder()
			.contextRegistry(contextRegistry)
			.build();
		executorService = ContextExecutorService.wrap(Executors.newSingleThreadExecutor(), snapshotFactory);
		CircuitBreakerConfig circuitBreakerConfig = CircuitBreakerConfig.custom()
			.slidingWindowSize(2)
			.minimumNumberOfCalls(2)
			.failureRateThreshold(50)
			.waitDurationInOpenState(Duration.ofSeconds(30))
			.build();
		circuitBreakerRegistry = CircuitBreakerRegistry.of(circuitBreakerConfig);
		TimeLimiterRegistry timeLimiterRegistry = TimeLimiterRegistry.of(
			TimeLimiterConfig.custom()
				.timeoutDuration(Duration.ofMillis(50))
				.cancelRunningFuture(true)
				.build()
		);
		resilience = new AiProviderResilience(
			circuitBreakerRegistry,
			timeLimiterRegistry,
			executorService,
			observationRegistry
		);
	}

	@AfterEach
	void tearDown() {
		MDC.remove("requestId");
		executorService.shutdownNow();
	}

	@Test
	void returnsSuccessfulProviderResponse() {
		assertThat(resilience.execute(() -> "analysis")).isEqualTo("analysis");
	}

	@Test
	void propagatesTheAiObservationAndRequestIdToTheProviderThread() {
		AtomicReference<String> currentObservation = new AtomicReference<>();
		AtomicReference<String> currentRequestId = new AtomicReference<>();
		MDC.put("requestId", "ai-test-request");

		resilience.execute(() -> {
			currentObservation.set(observationRegistry.getCurrentObservation().getContext().getName());
			currentRequestId.set(MDC.get("requestId"));
			return "analysis";
		});

		assertThat(currentObservation).hasValue("billiards.ai.provider");
		assertThat(currentRequestId).hasValue("ai-test-request");
	}

	@Test
	void timesOutSlowProviderCallsWithoutRetrying() {
		AtomicInteger attempts = new AtomicInteger();

		assertThatThrownBy(() -> resilience.execute(() -> {
			attempts.incrementAndGet();
			sleepUntilInterrupted();
			return "late-analysis";
		}))
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.AI_PROVIDER_TIMEOUT);

		assertThat(attempts).hasValue(1);
	}

	@Test
	void opensCircuitAfterRepeatedTimeoutsAndRejectsTheNextCall() {
		for (int attempt = 0; attempt < 2; attempt++) {
			assertThatThrownBy(() -> resilience.execute(() -> {
				sleepUntilInterrupted();
				return "late-analysis";
			})).isInstanceOf(BilliardsException.class);
		}

		AtomicInteger blockedCallAttempts = new AtomicInteger();
		assertThatThrownBy(() -> resilience.execute(() -> {
			blockedCallAttempts.incrementAndGet();
			return "should-not-run";
		}))
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.AI_SERVICE_UNAVAILABLE);

		assertThat(blockedCallAttempts).hasValue(0);
		assertThat(circuitBreakerRegistry.circuitBreaker(AiProviderResilience.INSTANCE_NAME).getState())
			.isEqualTo(CircuitBreaker.State.OPEN);
	}

	@Test
	void preservesKnownBusinessFailuresWithoutRetrying() {
		AtomicInteger attempts = new AtomicInteger();

		assertThatThrownBy(() -> resilience.execute(() -> {
			attempts.incrementAndGet();
			throw new BilliardsException(ErrorCode.AI_ANALYSIS_FAILED);
		}))
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.AI_ANALYSIS_FAILED);

		assertThat(attempts).hasValue(1);
	}

	private void sleepUntilInterrupted() {
		try {
			Thread.sleep(Duration.ofSeconds(5).toMillis());
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
		}
	}
}
