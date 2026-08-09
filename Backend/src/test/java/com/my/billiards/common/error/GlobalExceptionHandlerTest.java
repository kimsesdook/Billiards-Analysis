package com.my.billiards.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.my.billiards.common.ratelimit.RateLimitExceededException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

	@Test
	void returnsRetryAfterHeaderForRateLimitExceeded() {
		GlobalExceptionHandler handler = new GlobalExceptionHandler();

		ResponseEntity<ErrorResponse> response = handler.handleRateLimitExceeded(
			new RateLimitExceededException(42)
		);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
		assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("42");
		assertThat(response.getBody()).isNotNull();
		assertThat(response.getBody().code()).isEqualTo("RATE_LIMIT_001");
	}
}
