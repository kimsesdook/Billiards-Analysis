package com.my.billiards.common.ratelimit;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class RedisRateLimitStore implements RateLimitStore {

	private static final String SCRIPT_SOURCE = """
		local requestCount = redis.call('INCR', KEYS[1])
		if requestCount == 1 then
			redis.call('PEXPIRE', KEYS[1], ARGV[1])
		end
		local ttl = redis.call('PTTL', KEYS[1])
		return {requestCount, ttl}
		""";

	@SuppressWarnings("rawtypes")
	private static final DefaultRedisScript<List> INCREMENT_SCRIPT =
		new DefaultRedisScript<>(SCRIPT_SOURCE, List.class);

	private final StringRedisTemplate redisTemplate;

	@Override
	public RateLimitResult increment(String key, Duration window) {
		try {
			List<?> result = redisTemplate.execute(
				INCREMENT_SCRIPT,
				List.of(key),
				Long.toString(window.toMillis())
			);
			if (result == null || result.size() != 2) {
				throw unavailable(null);
			}

			long requestCount = toLong(result.get(0));
			long ttlMillis = toLong(result.get(1));
			long retryAfterSeconds = ttlMillis > 0
				? Math.max(1, (ttlMillis + 999) / 1000)
				: Math.max(1, window.toSeconds());
			return new RateLimitResult(requestCount, retryAfterSeconds);
		} catch (DataAccessException exception) {
			throw unavailable(exception);
		}
	}

	private long toLong(Object value) {
		if (value instanceof Number number) {
			return number.longValue();
		}
		try {
			return Long.parseLong(String.valueOf(value));
		} catch (NumberFormatException exception) {
			throw unavailable(exception);
		}
	}

	private BilliardsException unavailable(Exception cause) {
		String type = cause == null ? "InvalidRedisResult" : cause.getClass().getSimpleName();
		log.warn("Rate limit store is unavailable: type={}", type);
		return new BilliardsException(ErrorCode.RATE_LIMIT_SERVICE_UNAVAILABLE);
	}
}
