package com.my.billiards.notification.websocket;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

@Component
public class NotificationWebSocketSessionRegistry {

	private final ConcurrentMap<Long, Set<WebSocketSession>> sessionsByMemberId = new ConcurrentHashMap<>();

	public void register(Long memberId, WebSocketSession session) {
		sessionsByMemberId.computeIfAbsent(memberId, ignored -> ConcurrentHashMap.newKeySet())
			.add(session);
	}

	public void unregister(Long memberId, WebSocketSession session) {
		Set<WebSocketSession> sessions = sessionsByMemberId.get(memberId);
		if (sessions == null) {
			return;
		}

		sessions.remove(session);
		if (sessions.isEmpty()) {
			sessionsByMemberId.remove(memberId, sessions);
		}
	}

	public List<WebSocketSession> findOpenSessions(Long memberId) {
		Set<WebSocketSession> sessions = sessionsByMemberId.get(memberId);
		if (sessions == null) {
			return List.of();
		}

		return sessions.stream()
			.filter(WebSocketSession::isOpen)
			.toList();
	}
}
