package com.my.billiards.ai.config;

import io.micrometer.context.ContextExecutorService;
import io.micrometer.context.ContextRegistry;
import io.micrometer.context.ContextSnapshotFactory;
import io.micrometer.context.integration.Slf4jThreadLocalAccessor;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.observation.contextpropagation.ObservationThreadLocalAccessor;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "spring.ai.model.chat", havingValue = "google-genai")
public class AiResilienceConfig {

	@Bean(name = "aiProviderExecutor", destroyMethod = "shutdown")
	public ExecutorService aiProviderExecutor(
		AiReportProperties properties,
		ObservationRegistry observationRegistry
	) {
		int threads = properties.getExecutorThreads();
		ExecutorService executorService = new ThreadPoolExecutor(
			threads,
			threads,
			0L,
			TimeUnit.MILLISECONDS,
			new ArrayBlockingQueue<>(properties.getExecutorQueueCapacity()),
			aiThreadFactory(),
			new ThreadPoolExecutor.AbortPolicy()
		);
		ContextRegistry contextRegistry = new ContextRegistry()
			.registerThreadLocalAccessor(new ObservationThreadLocalAccessor(observationRegistry))
			.registerThreadLocalAccessor(new Slf4jThreadLocalAccessor("requestId"));
		ContextSnapshotFactory snapshotFactory = ContextSnapshotFactory.builder()
			.contextRegistry(contextRegistry)
			.build();
		return ContextExecutorService.wrap(executorService, snapshotFactory);
	}

	private ThreadFactory aiThreadFactory() {
		AtomicInteger sequence = new AtomicInteger();
		return task -> {
			Thread thread = new Thread(task, "ai-provider-" + sequence.incrementAndGet());
			thread.setDaemon(true);
			return thread;
		};
	}
}
