package com.my.billiards.common.api;

public record ApiResponse<T>(
	boolean success,
	T data,
	String message
) {

	public static <T> ApiResponse<T> success(T data) {
		return new ApiResponse<>(true, data, null);
	}

	public static ApiResponse<Void> ok() {
		return new ApiResponse<>(true, null, null);
	}

	public static ApiResponse<Void> message(String message) {
		return new ApiResponse<>(true, null, message);
	}
}
