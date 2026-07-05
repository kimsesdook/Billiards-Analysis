package com.my.billiards.common.error;

public class BilliardsException extends RuntimeException {

	private final ErrorCode errorCode;

	public BilliardsException(ErrorCode errorCode) {
		super(errorCode.getMessage());
		this.errorCode = errorCode;
	}

	public BilliardsException(ErrorCode errorCode, String message) {
		super(message);
		this.errorCode = errorCode;
	}

	public ErrorCode getErrorCode() {
		return errorCode;
	}
}
