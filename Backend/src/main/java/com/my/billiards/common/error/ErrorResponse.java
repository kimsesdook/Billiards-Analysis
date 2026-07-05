package com.my.billiards.common.error;

import java.util.List;

public record ErrorResponse(
	boolean success,
	String code,
	String message,
	List<ValidationError> errors
) {

	public static ErrorResponse of(ErrorCode errorCode) {
		return new ErrorResponse(false, errorCode.getCode(), errorCode.getMessage(), List.of());
	}

	public static ErrorResponse of(ErrorCode errorCode, String message) {
		return new ErrorResponse(false, errorCode.getCode(), message, List.of());
	}

	public static ErrorResponse of(ErrorCode errorCode, List<ValidationError> errors) {
		return new ErrorResponse(false, errorCode.getCode(), errorCode.getMessage(), errors);
	}

	public record ValidationError(
		String field,
		String reason
	) {
	}
}
