package com.my.billiards.auth.token;

import com.my.billiards.config.BilliardsProperties;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenCookieFactory {

	public static final String COOKIE_NAME = "billiards_refresh_token";
	private static final String COOKIE_PATH = "/api/auth";
	private static final String SAME_SITE_POLICY = "Strict";

	private final BilliardsProperties properties;

	public ResponseCookie create(String refreshToken, long maxAgeSeconds) {
		return baseCookie(refreshToken)
			.maxAge(Duration.ofSeconds(maxAgeSeconds))
			.build();
	}

	public ResponseCookie clear() {
		return baseCookie("")
			.maxAge(Duration.ZERO)
			.build();
	}

	private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
		return ResponseCookie.from(COOKIE_NAME, value)
			.httpOnly(true)
			.secure(properties.getJwt().isRefreshCookieSecure())
			.sameSite(SAME_SITE_POLICY)
			.path(COOKIE_PATH);
	}
}
