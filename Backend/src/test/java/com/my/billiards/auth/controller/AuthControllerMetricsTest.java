package com.my.billiards.auth.controller;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.my.billiards.auth.dto.LoginRequest;
import com.my.billiards.auth.dto.LoginResponse;
import com.my.billiards.auth.service.AuthSessionResult;
import com.my.billiards.auth.service.AuthService;
import com.my.billiards.auth.token.RefreshTokenCookieFactory;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.common.observability.BusinessMetrics;
import com.my.billiards.common.ratelimit.RateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

class AuthControllerMetricsTest {

	private AuthService authService;
	private BusinessMetrics businessMetrics;
	private AuthController controller;
	private HttpServletRequest httpRequest;
	private LoginRequest loginRequest;

	@BeforeEach
	void setUp() {
		authService = mock(AuthService.class);
		businessMetrics = mock(BusinessMetrics.class);
		RefreshTokenCookieFactory cookieFactory = mock(RefreshTokenCookieFactory.class);
		when(cookieFactory.create(anyString(), anyLong())).thenReturn(
			ResponseCookie.from(RefreshTokenCookieFactory.COOKIE_NAME, "refresh-token").build()
		);
		controller = new AuthController(
			authService,
			cookieFactory,
			mock(RateLimitService.class),
			businessMetrics
		);
		httpRequest = mock(HttpServletRequest.class);
		when(httpRequest.getRemoteAddr()).thenReturn("127.0.0.1");
		loginRequest = new LoginRequest("member@example.com", "password123");
	}

	@Test
	void recordsSuccessfulLogin() {
		when(authService.login(loginRequest)).thenReturn(new AuthSessionResult(
			mock(LoginResponse.class),
			"refresh-token",
			3600
		));

		controller.login(loginRequest, httpRequest);

		verify(businessMetrics).recordLoginSuccess();
	}

	@Test
	void recordsFailedLoginWithoutSensitiveTags() {
		when(authService.login(loginRequest)).thenThrow(new BilliardsException(ErrorCode.UNAUTHORIZED));

		assertThatThrownBy(() -> controller.login(loginRequest, httpRequest))
			.isInstanceOf(BilliardsException.class);

		verify(businessMetrics).recordLoginFailure();
	}
}
