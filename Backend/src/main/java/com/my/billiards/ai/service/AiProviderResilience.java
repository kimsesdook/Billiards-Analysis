package com.my.billiards.ai.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.github.resilience4j.timelimiter.TimeLimiterRegistry;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "spring.ai.model.chat", havingValue = "google-genai")
public class AiProviderResilience {

	static final String INSTANCE_NAME = "gemini-ai";

	private final CircuitBreaker circuitBreaker;
	private final TimeLimiter timeLimiter;
	private final ExecutorService executorService;

	public AiProviderResilience(
		CircuitBreakerRegistry circuitBreakerRegistry,
		TimeLimiterRegistry timeLimiterRegistry,
		@Qualifier("aiProviderExecutor") ExecutorService executorService
	) {
		this.circuitBreaker = circuitBreakerRegistry.circuitBreaker(INSTANCE_NAME);
		this.timeLimiter = timeLimiterRegistry.timeLimiter(INSTANCE_NAME);
		this.executorService = executorService;
	}

	public <T> T execute(Supplier<T> aiCall) {
		try {
			return circuitBreaker.executeCallable(() ->
				timeLimiter.executeFutureSupplier(() -> executorService.submit(aiCall::get))
			);
		} catch (CallNotPermittedException exception) {
			throw new BilliardsException(
				ErrorCode.AI_SERVICE_UNAVAILABLE,
				"AI analysis is temporarily unavailable. Please try again shortly."
			);
		} catch (TimeoutException exception) {
			throw new BilliardsException(ErrorCode.AI_PROVIDER_TIMEOUT);
		} catch (RejectedExecutionException exception) {
			throw new BilliardsException(
				ErrorCode.AI_SERVICE_UNAVAILABLE,
				"AI analysis is busy. Please try again shortly."
			);
		} catch (ExecutionException exception) {
			throw translateFailure(exception.getCause());
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new BilliardsException(
				ErrorCode.AI_SERVICE_UNAVAILABLE,
				"AI analysis was interrupted. Please try again later."
			);
		} catch (Exception exception) {
			throw translateFailure(exception);
		}
	}

	private RuntimeException translateFailure(Throwable cause) {
		if (cause instanceof BilliardsException billiardsException) {
			return billiardsException;
		}
		return new BilliardsException(ErrorCode.AI_ANALYSIS_FAILED);
	}
}
