package com.my.billiards.ai.lock;

import java.time.Duration;
import java.util.Optional;

public interface AiReportLockStore {

	Optional<AiReportLockLease> tryAcquire(String identity, Duration timeToLive);

	void release(AiReportLockLease lease);
}
