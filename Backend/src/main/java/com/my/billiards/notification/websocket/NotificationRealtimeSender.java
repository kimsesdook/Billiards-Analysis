package com.my.billiards.notification.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.notification.dto.NotificationRealtimeMessage;
import com.my.billiards.notification.dto.NotificationResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
@RequiredArgsConstructor
public class NotificationRealtimeSender {

	private final NotificationWebSocketSessionRegistry sessionRegistry;
	private final ObjectMapper objectMapper = createObjectMapper();

	public void sendCreated(Long memberId, NotificationResponse notification) {
		String payload = serialize(NotificationRealtimeMessage.created(notification));

		for (WebSocketSession session : sessionRegistry.findOpenSessions(memberId)) {
			try {
				synchronized (session) {
					session.sendMessage(new TextMessage(payload));
				}
			} catch (IOException exception) {
				sessionRegistry.unregister(memberId, session);
			}
		}
	}

	private String serialize(NotificationRealtimeMessage message) {
		try {
			return objectMapper.writeValueAsString(ApiResponse.success(message));
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException("Failed to serialize notification realtime message.", exception);
		}
	}

	private ObjectMapper createObjectMapper() {
		SimpleModule javaTimeModule = new SimpleModule();
		javaTimeModule.addSerializer(LocalDateTime.class, ToStringSerializer.instance);

		return JsonMapper.builder()
			.addModule(javaTimeModule)
			.build();
	}
}
