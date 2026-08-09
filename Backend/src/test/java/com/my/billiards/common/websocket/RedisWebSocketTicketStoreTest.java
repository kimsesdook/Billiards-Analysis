package com.my.billiards.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class RedisWebSocketTicketStoreTest {

	@Test
	void createsStoreInDockerProfileWithoutAnObjectMapperBean() {
		try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
			context.getEnvironment().setActiveProfiles("docker");
			context.registerBean(StringRedisTemplate.class, () -> mock(StringRedisTemplate.class));
			context.register(RedisWebSocketTicketStore.class);
			context.refresh();

			assertThat(context.getBean(RedisWebSocketTicketStore.class)).isNotNull();
		}
	}

	@Test
	void serializesAndConsumesTicketPayload() {
		StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
		@SuppressWarnings("unchecked")
		ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
		when(redisTemplate.opsForValue()).thenReturn(valueOperations);
		when(valueOperations.getAndDelete("billiards:websocket-ticket:ticket-hash"))
			.thenReturn("{\"memberId\":10,\"purpose\":\"GAME_ROOM\",\"roomId\":7}");
		RedisWebSocketTicketStore store = new RedisWebSocketTicketStore(redisTemplate);

		assertThat(store.consume("ticket-hash"))
			.contains(new WebSocketTicketPayload(10L, WebSocketTicketPurpose.GAME_ROOM, 7L));
		store.save(
			"ticket-hash",
			new WebSocketTicketPayload(10L, WebSocketTicketPurpose.GAME_ROOM, 7L),
			Duration.ofSeconds(30)
		);
		verify(valueOperations).set(
			eq("billiards:websocket-ticket:ticket-hash"),
			contains("\"purpose\":\"GAME_ROOM\""),
			eq(Duration.ofSeconds(30))
		);
	}
}
