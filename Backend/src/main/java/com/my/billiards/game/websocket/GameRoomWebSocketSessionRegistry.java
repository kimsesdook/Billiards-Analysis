package com.my.billiards.game.websocket;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class GameRoomWebSocketSessionRegistry {

    private final ConcurrentMap<Long, Set<WebSocketSession>> sessionsByRoomId = new ConcurrentHashMap<>();

    public void register(Long roomId, WebSocketSession session) {
        sessionsByRoomId.computeIfAbsent(roomId, ignored -> ConcurrentHashMap.newKeySet())
            .add(session);
    }

    public void unregister(Long roomId, WebSocketSession session) {
        Set<WebSocketSession> sessions = sessionsByRoomId.get(roomId);
        if (sessions == null) {
            return;
        }

        sessions.remove(session);
        if (sessions.isEmpty()) {
            sessionsByRoomId.remove(roomId, sessions);
        }
    }

    public List<WebSocketSession> findOpenSessions(Long roomId) {
        Set<WebSocketSession> sessions = sessionsByRoomId.get(roomId);
        if (sessions == null) {
            return List.of();
        }

        return sessions.stream()
            .filter(WebSocketSession::isOpen)
            .toList();
    }
}
