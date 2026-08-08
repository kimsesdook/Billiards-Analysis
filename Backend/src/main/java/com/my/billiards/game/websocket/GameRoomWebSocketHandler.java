package com.my.billiards.game.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class GameRoomWebSocketHandler extends TextWebSocketHandler {

    private final GameRoomWebSocketSessionRegistry sessionRegistry;
    private final GameRoomRealtimeSender realtimeSender;

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long roomId = resolveRoomId(session);
        sessionRegistry.register(roomId, session);
        session.sendMessage(new TextMessage(realtimeSender.connectedPayload(roomId)));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessionRegistry.unregister(resolveRoomId(session), session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessionRegistry.unregister(resolveRoomId(session), session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    private Long resolveRoomId(WebSocketSession session) {
        Object roomId = session.getAttributes().get(GameRoomWebSocketAttributes.ROOM_ID);
        if (roomId instanceof Long value) {
            return value;
        }

        throw new IllegalStateException("Game room WebSocket room id is missing.");
    }
}
