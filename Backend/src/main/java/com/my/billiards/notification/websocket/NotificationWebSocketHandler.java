package com.my.billiards.notification.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandler extends TextWebSocketHandler {

	private final NotificationWebSocketSessionRegistry sessionRegistry;

	@Override
	public void afterConnectionEstablished(WebSocketSession session) throws Exception {
		Long memberId = resolveMemberId(session);
		sessionRegistry.register(memberId, session);
		session.sendMessage(new TextMessage("""
			{"success":true,"data":{"eventType":"CONNECTED","notification":null},"message":null}
			"""));
	}

	@Override
	public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
		sessionRegistry.unregister(resolveMemberId(session), session);
	}

	@Override
	public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
		sessionRegistry.unregister(resolveMemberId(session), session);
		if (session.isOpen()) {
			session.close(CloseStatus.SERVER_ERROR);
		}
	}

	private Long resolveMemberId(WebSocketSession session) {
		Object memberId = session.getAttributes().get(NotificationWebSocketAttributes.MEMBER_ID);
		if (memberId instanceof Long value) {
			return value;
		}

		throw new IllegalStateException("Notification WebSocket member id is missing.");
	}
}
