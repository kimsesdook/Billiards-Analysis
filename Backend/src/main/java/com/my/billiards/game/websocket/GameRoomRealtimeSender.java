package com.my.billiards.game.websocket;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.game.dto.GameRoomRealtimeMessage;
import com.my.billiards.game.event.GameRoomRealtimeEvent;
import java.io.IOException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
@RequiredArgsConstructor
public class GameRoomRealtimeSender {

    private final GameRoomWebSocketSessionRegistry sessionRegistry;
    private final ObjectMapper objectMapper = createObjectMapper();

    public String connectedPayload(Long roomId) {
        return serialize(GameRoomRealtimeMessage.connected(roomId));
    }

    public void send(GameRoomRealtimeEvent event) {
        String payload = serialize(GameRoomRealtimeMessage.event(
            event.eventType(),
            event.roomId(),
            event.gameRoom(),
            event.liveState()
        ));

        for (WebSocketSession session : sessionRegistry.findOpenSessions(event.roomId())) {
            try {
                synchronized (session) {
                    session.sendMessage(new TextMessage(payload));
                }
            } catch (IOException exception) {
                sessionRegistry.unregister(event.roomId(), session);
            }
        }
    }

    private String serialize(GameRoomRealtimeMessage message) {
        try {
            return objectMapper.writeValueAsString(ApiResponse.success(message));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize game room realtime message.", exception);
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
