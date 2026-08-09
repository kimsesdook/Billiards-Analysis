package com.my.billiards.common.ratelimit;

import java.time.Duration;

public interface RateLimitStore {

	RateLimitResult increment(String key, Duration window);
}
