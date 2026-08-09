package com.my.billiards.auth.service;

import com.my.billiards.auth.dto.LoginResponse;

public record AuthSessionResult(
	LoginResponse response,
	String refreshToken,
	long refreshTokenExpiresInSeconds
) {
}
