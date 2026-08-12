package com.my.billiards.auth.controller;

import com.my.billiards.auth.dto.LoginRequest;
import com.my.billiards.auth.dto.LoginResponse;
import com.my.billiards.auth.dto.SignUpRequest;
import com.my.billiards.auth.dto.SignUpResponse;
import com.my.billiards.auth.service.AuthSessionResult;
import com.my.billiards.auth.service.AuthService;
import com.my.billiards.auth.token.RefreshTokenCookieFactory;
import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.observability.BusinessMetrics;
import com.my.billiards.common.ratelimit.RateLimitService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Signup and JWT login")
public class AuthController {

	private final AuthService authService;
	private final RefreshTokenCookieFactory refreshTokenCookieFactory;
	private final RateLimitService rateLimitService;
	private final BusinessMetrics businessMetrics;

	@PostMapping("/signup")
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse<SignUpResponse> signUp(@Valid @RequestBody SignUpRequest request) {
		return ApiResponse.success(authService.signUp(request));
	}

	@PostMapping("/login")
	public ResponseEntity<ApiResponse<LoginResponse>> login(
		@Valid @RequestBody LoginRequest request,
		HttpServletRequest httpRequest
	) {
		rateLimitService.checkLogin(request.email(), httpRequest.getRemoteAddr());
		try {
			ResponseEntity<ApiResponse<LoginResponse>> response = authenticationResponse(authService.login(request));
			businessMetrics.recordLoginSuccess();
			return response;
		} catch (BilliardsException exception) {
			businessMetrics.recordLoginFailure();
			throw exception;
		}
	}

	@PostMapping("/refresh")
	public ResponseEntity<ApiResponse<LoginResponse>> refresh(
		@CookieValue(name = RefreshTokenCookieFactory.COOKIE_NAME, required = false) String refreshToken
	) {
		return authenticationResponse(authService.refresh(refreshToken));
	}

	@PostMapping("/logout")
	public ResponseEntity<ApiResponse<Void>> logout(
		@CookieValue(name = RefreshTokenCookieFactory.COOKIE_NAME, required = false) String refreshToken
	) {
		authService.logout(refreshToken);
		return ResponseEntity.ok()
			.header(HttpHeaders.CACHE_CONTROL, "no-store")
			.header(HttpHeaders.SET_COOKIE, refreshTokenCookieFactory.clear().toString())
			.body(ApiResponse.ok());
	}

	private ResponseEntity<ApiResponse<LoginResponse>> authenticationResponse(AuthSessionResult result) {
		return ResponseEntity.ok()
			.header(HttpHeaders.CACHE_CONTROL, "no-store")
			.header(
				HttpHeaders.SET_COOKIE,
				refreshTokenCookieFactory.create(
					result.refreshToken(),
					result.refreshTokenExpiresInSeconds()
				).toString()
			)
			.body(ApiResponse.success(result.response()));
	}
}
