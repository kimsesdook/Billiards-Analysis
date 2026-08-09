package com.my.billiards.common.ratelimit;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("test")
public class InMemoryRateLimitStore implements RateLimitStore {

	private final ConcurrentMap<String, Counter> counters = new ConcurrentHashMap<>();

	@Override
	public RateLimitResult increment(String key, Duration window) {
		Instant now = Instant.now();
		AtomicReference<Counter> updatedCounter = new AtomicReference<>();
		counters.compute(key, (ignored, current) -> {
			Counter next = current == null || !current.expiresAt().isAfter(now)
				? new Counter(1, now.plus(window))
				: new Counter(current.requestCount() + 1, current.expiresAt());
			updatedCounter.set(next);
			return next;
		});

		Counter counter = updatedCounter.get();
		long remainingMillis = Math.max(1, Duration.between(now, counter.expiresAt()).toMillis());
		return new RateLimitResult(
			counter.requestCount(),
			Math.max(1, (remainingMillis + 999) / 1000)
		);
	}

	private record Counter(long requestCount, Instant expiresAt) {
	}
}
