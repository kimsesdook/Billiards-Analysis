package com.my.billiards.common.error;

import jakarta.validation.ConstraintViolationException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

	@ExceptionHandler(BilliardsException.class)
	public ResponseEntity<ErrorResponse> handleBilliardsException(BilliardsException exception) {
		ErrorCode errorCode = exception.getErrorCode();
		log.warn("Handled business exception: code={}, status={}", errorCode.getCode(), errorCode.getStatus().value());
		return ResponseEntity
			.status(errorCode.getStatus())
			.body(ErrorResponse.of(errorCode, exception.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException exception) {
		List<ErrorResponse.ValidationError> errors = exception.getBindingResult()
			.getFieldErrors()
			.stream()
			.map(error -> new ErrorResponse.ValidationError(error.getField(), error.getDefaultMessage()))
			.toList();
		log.warn("Handled request validation exception: errorCount={}", errors.size());

		return ResponseEntity
			.status(ErrorCode.INVALID_INPUT_VALUE.getStatus())
			.body(ErrorResponse.of(ErrorCode.INVALID_INPUT_VALUE, errors));
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException exception) {
		List<ErrorResponse.ValidationError> errors = exception.getConstraintViolations()
			.stream()
			.map(violation -> new ErrorResponse.ValidationError(
				violation.getPropertyPath().toString(),
				violation.getMessage()
			))
			.toList();
		log.warn("Handled constraint violation: errorCount={}", errors.size());

		return ResponseEntity
			.status(ErrorCode.INVALID_INPUT_VALUE.getStatus())
			.body(ErrorResponse.of(ErrorCode.INVALID_INPUT_VALUE, errors));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException exception) {
		log.warn("Handled unreadable request body");
		return ResponseEntity
			.status(ErrorCode.INVALID_INPUT_VALUE.getStatus())
			.body(ErrorResponse.of(ErrorCode.INVALID_INPUT_VALUE));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleException(Exception exception) {
		logUnexpectedException(exception);
		return ResponseEntity
			.status(ErrorCode.INTERNAL_SERVER_ERROR.getStatus())
			.body(ErrorResponse.of(ErrorCode.INTERNAL_SERVER_ERROR));
	}

	private void logUnexpectedException(Exception exception) {
		StackTraceElement[] stackTrace = exception.getStackTrace();
		if (stackTrace.length == 0) {
			log.error("Unhandled exception: type={}", exception.getClass().getName());
			return;
		}

		StackTraceElement origin = stackTrace[0];
		log.error(
			"Unhandled exception: type={}, origin={}.{}:{}",
			exception.getClass().getName(),
			origin.getClassName(),
			origin.getMethodName(),
			origin.getLineNumber()
		);
	}
}
