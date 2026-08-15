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
import java.time.Duration;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AiProviderResilienceTest {

	private ExecutorService executorService;
	private CircuitBreakerRegistry circuitBreakerRegistry;
	private AiProviderResilience resilience;

	@BeforeEach
	void setUp() {
		executorService = Executors.newSingleThreadExecutor();
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
			executorService
		);
	}

	@AfterEach
	void tearDown() {
		executorService.shutdownNow();
	}

	@Test
	void returnsSuccessfulProviderResponse() {
		assertThat(resilience.execute(() -> "analysis")).isEqualTo("analysis");
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
