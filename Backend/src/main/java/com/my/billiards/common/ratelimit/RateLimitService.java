package com.my.billiards.common.ratelimit;

import com.my.billiards.common.observability.BusinessMetrics;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RateLimitService {

	private static final String KEY_PREFIX = "billiards:rate-limit:";

	private final RateLimitStore rateLimitStore;
	private final RateLimitProperties properties;
	private final BusinessMetrics businessMetrics;

	public void checkLogin(String email, String clientAddress) {
		check(
			"login-address",
			normalize(clientAddress),
			properties.getLoginAddressMaxRequests(),
			properties.getLoginWindowSeconds()
		);
		check(
			"login-account",
			normalize(email).toLowerCase(Locale.ROOT),
			properties.getLoginAccountMaxRequests(),
			properties.getLoginWindowSeconds()
		);
	}

	public void checkWebSocketTicket(Long memberId) {
		check(
			"websocket-ticket",
			String.valueOf(memberId),
			properties.getWebSocketTicketMaxRequests(),
			properties.getWebSocketTicketWindowSeconds()
		);
	}

	public void checkAiGeneration(Long memberId) {
		check(
			"ai-generation",
			String.valueOf(memberId),
			properties.getAiGenerationMaxRequests(),
			properties.getAiGenerationWindowSeconds()
		);
	}

	private void check(String scope, String identity, int maxRequests, long windowSeconds) {
		if (maxRequests <= 0 || windowSeconds <= 0) {
			throw new IllegalStateException("Rate limit configuration must be positive.");
		}

		RateLimitResult result = rateLimitStore.increment(
			KEY_PREFIX + scope + ":" + hash(identity),
			Duration.ofSeconds(windowSeconds)
		);
		if (result.requestCount() > maxRequests) {
			businessMetrics.recordRateLimitRejection(scope);
			throw new RateLimitExceededException(result.retryAfterSeconds());
		}
	}

	private String normalize(String value) {
		return value == null || value.isBlank() ? "unknown" : value.strip();
	}

	private String hash(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is not available.", exception);
		}
	}
}
