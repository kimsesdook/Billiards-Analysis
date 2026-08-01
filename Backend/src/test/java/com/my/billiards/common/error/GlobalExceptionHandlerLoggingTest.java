package com.my.billiards.common.error;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerLoggingTest {

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
	private final Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@Test
	void logsBusinessErrorCodeWithoutCustomExceptionMessage() {
		ListAppender<ILoggingEvent> appender = attachAppender();

		try {
			ResponseEntity<ErrorResponse> response = handler.handleBilliardsException(
				new BilliardsException(ErrorCode.DUPLICATE_EMAIL, "email=private@example.com")
			);

			assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
			assertThat(response.getBody().code()).isEqualTo("MEMBER_001");
			assertThat(appender.list).hasSize(1);
			assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.WARN);
			assertThat(appender.list.get(0).getFormattedMessage())
				.contains("MEMBER_001")
				.doesNotContain("private@example.com");
		} finally {
			logger.detachAppender(appender);
		}
	}

	@Test
	void logsUnexpectedErrorTypeAndOriginWithoutExceptionMessage() {
		ListAppender<ILoggingEvent> appender = attachAppender();

		try {
			ResponseEntity<ErrorResponse> response = handler.handleException(
				new IllegalStateException("token=private-token")
			);

			assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
			assertThat(response.getBody().code()).isEqualTo("COMMON_999");
			assertThat(appender.list).hasSize(1);
			assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.ERROR);
			assertThat(appender.list.get(0).getFormattedMessage())
				.contains(IllegalStateException.class.getName())
				.doesNotContain("private-token");
		} finally {
			logger.detachAppender(appender);
		}
	}

	private ListAppender<ILoggingEvent> attachAppender() {
		ListAppender<ILoggingEvent> appender = new ListAppender<>();
		appender.start();
		logger.addAppender(appender);
		return appender;
	}
}
