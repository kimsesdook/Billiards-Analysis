package com.my.billiards.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateLimitServiceTest {

	private RateLimitProperties properties;
	private InMemoryRateLimitStore store;
	private RateLimitService service;

	@BeforeEach
	void setUp() {
		properties = new RateLimitProperties();
		properties.setLoginAccountMaxRequests(2);
		properties.setLoginAddressMaxRequests(3);
		properties.setLoginWindowSeconds(60);
		properties.setWebSocketTicketMaxRequests(2);
		properties.setWebSocketTicketWindowSeconds(60);
		properties.setAiGenerationMaxRequests(1);
		properties.setAiGenerationWindowSeconds(3600);
		store = new InMemoryRateLimitStore();
		service = new RateLimitService(store, properties);
	}

	@Test
	void rejectsLoginAttemptsAboveTheAccountLimit() {
		service.checkLogin("Member@Example.com", "127.0.0.1");
		service.checkLogin("member@example.com", "127.0.0.2");

		assertThatThrownBy(() -> service.checkLogin(" member@example.com ", "127.0.0.3"))
			.isInstanceOf(RateLimitExceededException.class)
			.extracting(exception -> ((RateLimitExceededException) exception).getRetryAfterSeconds())
			.matches(seconds -> (long) seconds > 0 && (long) seconds <= 60);
	}

	@Test
	void rejectsLoginAttemptsAboveTheAddressLimitAcrossAccounts() {
		service.checkLogin("first@example.com", "127.0.0.1");
		service.checkLogin("second@example.com", "127.0.0.1");
		service.checkLogin("third@example.com", "127.0.0.1");

		assertThatThrownBy(() -> service.checkLogin("fourth@example.com", "127.0.0.1"))
			.isInstanceOf(RateLimitExceededException.class);
	}

	@Test
	void limitsWebSocketTicketsAndAiGenerationIndependently() {
		service.checkWebSocketTicket(10L);
		service.checkWebSocketTicket(10L);
		service.checkAiGeneration(10L);

		assertThatThrownBy(() -> service.checkWebSocketTicket(10L))
			.isInstanceOf(RateLimitExceededException.class);
		assertThatThrownBy(() -> service.checkAiGeneration(10L))
			.isInstanceOf(RateLimitExceededException.class);
	}

	@Test
	void hashesSensitiveRateLimitIdentities() {
		Queue<String> keys = new ConcurrentLinkedQueue<>();
		RateLimitStore recordingStore = (key, window) -> {
			keys.add(key);
			return new RateLimitResult(1, window.toSeconds());
		};
		RateLimitService recordingService = new RateLimitService(recordingStore, properties);

		recordingService.checkLogin("member@example.com", "203.0.113.10");

		assertThat(keys).hasSize(2);
		assertThat(keys).allMatch(key -> !key.contains("member@example.com"));
		assertThat(keys).allMatch(key -> !key.contains("203.0.113.10"));
	}

	@Test
	void incrementsConcurrentRequestsWithoutLostUpdates() {
		Queue<Long> requestCounts = new ConcurrentLinkedQueue<>();

		IntStream.range(0, 100).parallel().forEach(ignored -> requestCounts.add(
			store.increment("concurrent-key", Duration.ofMinutes(1)).requestCount()
		));

		assertThat(requestCounts).hasSize(100).doesNotHaveDuplicates();
		assertThat(requestCounts).contains(1L, 100L);
	}
}
