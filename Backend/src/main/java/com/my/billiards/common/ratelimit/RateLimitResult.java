package com.my.billiards.common.ratelimit;

public record RateLimitResult(
	long requestCount,
	long retryAfterSeconds
) {
}
