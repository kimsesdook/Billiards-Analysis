package com.my.billiards.auth.token;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.config.BilliardsProperties;
import com.my.billiards.member.domain.Member;
import java.nio.charset.StandardCharsets;
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
}
