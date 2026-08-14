package com.my.billiards.ai.lock;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("test")
public class InMemoryAiReportLockStore implements AiReportLockStore {

	private final ConcurrentMap<String, StoredLock> locks = new ConcurrentHashMap<>();

	@Override
	public Optional<AiReportLockLease> tryAcquire(String identity, Duration timeToLive) {
		Instant now = Instant.now();
		String ownerToken = UUID.randomUUID().toString();
		AtomicBoolean acquired = new AtomicBoolean(false);
		locks.compute(identity, (ignored, current) -> {
			if (current == null || !current.expiresAt().isAfter(now)) {
				acquired.set(true);
				return new StoredLock(ownerToken, now.plus(timeToLive));
			}
			return current;
		});

		return acquired.get()
			? Optional.of(new AiReportLockLease(identity, ownerToken))
			: Optional.empty();
	}

	@Override
	public void release(AiReportLockLease lease) {
		locks.computeIfPresent(lease.identity(), (ignored, current) ->
			current.ownerToken().equals(lease.ownerToken()) ? null : current
		);
	}

	private record StoredLock(String ownerToken, Instant expiresAt) {
	}
}
