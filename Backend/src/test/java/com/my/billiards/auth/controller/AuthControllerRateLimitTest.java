package com.my.billiards.auth.controller;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.my.billiards.auth.dto.LoginRequest;
import com.my.billiards.auth.service.AuthService;
import com.my.billiards.auth.token.RefreshTokenCookieFactory;
import com.my.billiards.common.ratelimit.RateLimitExceededException;
import com.my.billiards.common.ratelimit.RateLimitService;
import com.my.billiards.common.observability.BusinessMetrics;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

class AuthControllerRateLimitTest {

	@Test
	void checksRateLimitBeforePasswordAuthentication() {
		AuthService authService = mock(AuthService.class);
		RateLimitService rateLimitService = mock(RateLimitService.class);
		AuthController controller = new AuthController(
			authService,
			mock(RefreshTokenCookieFactory.class),
			rateLimitService,
			mock(BusinessMetrics.class)
		);
		HttpServletRequest httpRequest = mock(HttpServletRequest.class);
		when(httpRequest.getRemoteAddr()).thenReturn("203.0.113.10");
		doThrow(new RateLimitExceededException(60))
			.when(rateLimitService)
			.checkLogin("member@example.com", "203.0.113.10");

		assertThatThrownBy(() -> controller.login(
			new LoginRequest("member@example.com", "password123"),
			httpRequest
		)).isInstanceOf(RateLimitExceededException.class);

		verify(rateLimitService).checkLogin("member@example.com", "203.0.113.10");
		verifyNoInteractions(authService);
	}
}
