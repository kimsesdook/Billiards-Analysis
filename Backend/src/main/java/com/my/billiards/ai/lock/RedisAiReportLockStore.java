package com.my.billiards.ai.lock;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
public class RedisAiReportLockStore implements AiReportLockStore {

	private static final String KEY_PREFIX = "billiards:ai-report-lock:";
	private static final String RELEASE_SCRIPT_SOURCE = """
		if redis.call('GET', KEYS[1]) == ARGV[1] then
			return redis.call('DEL', KEYS[1])
		end
		return 0
		""";
	private static final DefaultRedisScript<Long> RELEASE_SCRIPT =
		new DefaultRedisScript<>(RELEASE_SCRIPT_SOURCE, Long.class);

	private final StringRedisTemplate redisTemplate;

	@Override
	public Optional<AiReportLockLease> tryAcquire(String identity, Duration timeToLive) {
		String ownerToken = UUID.randomUUID().toString();
		try {
			Boolean acquired = redisTemplate.opsForValue().setIfAbsent(
				key(identity),
				ownerToken,
				timeToLive
			);
			if (acquired == null) {
				throw unavailable(null);
			}
			return Boolean.TRUE.equals(acquired)
				? Optional.of(new AiReportLockLease(identity, ownerToken))
				: Optional.empty();
		} catch (DataAccessException exception) {
			throw unavailable(exception);
		}
	}

	@Override
	public void release(AiReportLockLease lease) {
		try {
			redisTemplate.execute(
				RELEASE_SCRIPT,
				List.of(key(lease.identity())),
				lease.ownerToken()
			);
		} catch (DataAccessException exception) {
			log.warn(
				"AI report lock release failed; expiration will recover it: type={}",
				exception.getClass().getSimpleName()
			);
		}
	}

	private String key(String identity) {
		return KEY_PREFIX + hash(identity);
	}

	private String hash(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is not available.", exception);
		}
	}

	private BilliardsException unavailable(Exception cause) {
		String type = cause == null ? "InvalidRedisResult" : cause.getClass().getSimpleName();
		log.warn("AI report lock store is unavailable: type={}", type);
		return new BilliardsException(ErrorCode.AI_COORDINATION_UNAVAILABLE);
	}
}
