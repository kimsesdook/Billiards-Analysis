package com.my.billiards.common.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import java.time.Duration;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class RedisWebSocketTicketStore implements WebSocketTicketStore {

	private static final String KEY_PREFIX = "billiards:websocket-ticket:";

	private final StringRedisTemplate redisTemplate;
	private final ObjectMapper objectMapper;

	@Override
	public void save(String ticketHash, WebSocketTicketPayload payload, Duration timeToLive) {
		try {
			String value = objectMapper.writeValueAsString(payload);
			redisTemplate.opsForValue().set(key(ticketHash), value, timeToLive);
		} catch (JsonProcessingException | DataAccessException exception) {
			throw unavailable(exception);
		}
	}

	@Override
	public Optional<WebSocketTicketPayload> consume(String ticketHash) {
		try {
			String value = redisTemplate.opsForValue().getAndDelete(key(ticketHash));
			if (value == null) {
				return Optional.empty();
			}
			return Optional.of(objectMapper.readValue(value, WebSocketTicketPayload.class));
		} catch (JsonProcessingException | DataAccessException exception) {
			throw unavailable(exception);
		}
	}

	private String key(String ticketHash) {
		return KEY_PREFIX + ticketHash;
	}

	private BilliardsException unavailable(Exception cause) {
		log.warn("WebSocket ticket store is unavailable: type={}", cause.getClass().getSimpleName());
		return new BilliardsException(ErrorCode.REALTIME_SERVICE_UNAVAILABLE);
	}
}
