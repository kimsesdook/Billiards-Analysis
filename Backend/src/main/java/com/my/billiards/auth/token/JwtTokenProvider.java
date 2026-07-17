package com.my.billiards.auth.token;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.config.BilliardsProperties;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

	private static final String HMAC_SHA256 = "HmacSHA256";
	private static final String TOKEN_TYPE = "Bearer";

	private final BilliardsProperties properties;
	private final ObjectMapper objectMapper = new ObjectMapper();

	public TokenIssueResult issue(Member member) {
		Instant issuedAt = Instant.now();
		Instant expiresAt = issuedAt.plus(
			properties.getJwt().getAccessTokenExpirationMinutes(),
			ChronoUnit.MINUTES
		);

		String header = encodeJson(Map.of(
			"alg", "HS256",
			"typ", "JWT"
		));
		String payload = encodeJson(Map.of(
			"sub", member.getId().toString(),
			"memberId", member.getId(),
			"email", member.getEmail(),
			"nickname", member.getNickname(),
			"role", member.getRole().name(),
			"iat", issuedAt.getEpochSecond(),
			"exp", expiresAt.getEpochSecond()
		));

		String unsignedToken = header + "." + payload;
		String signature = sign(unsignedToken);

		return new TokenIssueResult(
			unsignedToken + "." + signature,
			TOKEN_TYPE,
			expiresAt.getEpochSecond() - issuedAt.getEpochSecond()
		);
	}

	public JwtClaims parse(String token) {
		String[] parts = token.split("\\.", -1);
		if (parts.length != 3) {
			throw unauthorized();
		}

		String unsignedToken = parts[0] + "." + parts[1];
		if (!MessageDigest.isEqual(
			sign(unsignedToken).getBytes(StandardCharsets.UTF_8),
			parts[2].getBytes(StandardCharsets.UTF_8)
		)) {
			throw unauthorized();
		}

		Map<String, Object> payload = decodePayload(parts[1]);
		long expiresAt = getLong(payload, "exp");
		if (Instant.now().getEpochSecond() >= expiresAt) {
			throw unauthorized();
		}

		return new JwtClaims(
			getLong(payload, "memberId"),
			getString(payload, "email"),
			getRole(payload)
		);
	}

	private String encodeJson(Map<String, Object> value) {
		try {
			return base64UrlEncode(objectMapper.writeValueAsBytes(value));
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException("Failed to encode JWT payload.", exception);
		}
	}

	private String sign(String unsignedToken) {
		try {
			Mac mac = Mac.getInstance(HMAC_SHA256);
			mac.init(new SecretKeySpec(
				properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8),
				HMAC_SHA256
			));
			return base64UrlEncode(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
		} catch (Exception exception) {
			throw new IllegalStateException("Failed to sign JWT.", exception);
		}
	}

	private Map<String, Object> decodePayload(String payload) {
		try {
			return objectMapper.readValue(
				Base64.getUrlDecoder().decode(payload),
				new TypeReference<>() {
				}
			);
		} catch (IllegalArgumentException | IOException exception) {
			throw unauthorized();
		}
	}

	private long getLong(Map<String, Object> payload, String key) {
		Object value = payload.get(key);
		if (value instanceof Number number) {
			return number.longValue();
		}
		throw unauthorized();
	}

	private String getString(Map<String, Object> payload, String key) {
		Object value = payload.get(key);
		if (value instanceof String string && !string.isBlank()) {
			return string;
		}
		throw unauthorized();
	}

	private MemberRole getRole(Map<String, Object> payload) {
		try {
			return MemberRole.valueOf(getString(payload, "role"));
		} catch (IllegalArgumentException exception) {
			throw unauthorized();
		}
	}

	private BilliardsException unauthorized() {
		return new BilliardsException(ErrorCode.UNAUTHORIZED);
	}

	private String base64UrlEncode(byte[] source) {
		return Base64.getUrlEncoder()
			.withoutPadding()
			.encodeToString(source);
	}

	public record TokenIssueResult(
		String accessToken,
		String tokenType,
		long expiresInSeconds
	) {
	}

	public record JwtClaims(
		Long memberId,
		String email,
		MemberRole role
	) {
	}
}
