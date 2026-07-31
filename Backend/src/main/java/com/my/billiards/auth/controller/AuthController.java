package com.my.billiards.auth.controller;

import com.my.billiards.auth.dto.LoginRequest;
import com.my.billiards.auth.dto.LoginResponse;
import com.my.billiards.auth.dto.SignUpRequest;
import com.my.billiards.auth.dto.SignUpResponse;
import com.my.billiards.auth.service.AuthService;
import com.my.billiards.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

	@PostMapping("/signup")
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse<SignUpResponse> signUp(@Valid @RequestBody SignUpRequest request) {
		return ApiResponse.success(authService.signUp(request));
	}

	@PostMapping("/login")
	public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
		return ApiResponse.success(authService.login(request));
	}
}
