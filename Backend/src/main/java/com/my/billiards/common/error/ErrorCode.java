package com.my.billiards.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
	INVALID_INPUT_VALUE("COMMON_001", HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
	RESOURCE_NOT_FOUND("COMMON_002", HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
	DUPLICATE_EMAIL("MEMBER_001", HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),
	UNAUTHORIZED("AUTH_001", HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
	FORBIDDEN("AUTH_002", HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
	INTERNAL_SERVER_ERROR("COMMON_999", HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");

	private final String code;
	private final HttpStatus status;
	private final String message;

	ErrorCode(String code, HttpStatus status, String message) {
		this.code = code;
		this.status = status;
		this.message = message;
	}

	public String getCode() {
		return code;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getMessage() {
		return message;
	}
}
