package com.my.billiards.common.ratelimit;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;

public class RateLimitExceededException extends BilliardsException {

	private final long retryAfterSeconds;

	public RateLimitExceededException(long retryAfterSeconds) {
		super(ErrorCode.RATE_LIMIT_EXCEEDED);
		this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
	}

	public long getRetryAfterSeconds() {
		return retryAfterSeconds;
	}
}
