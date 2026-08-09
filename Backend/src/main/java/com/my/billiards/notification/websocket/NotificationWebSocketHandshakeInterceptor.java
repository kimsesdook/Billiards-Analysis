package com.my.billiards.notification.websocket;

import com.my.billiards.common.websocket.WebSocketTicketAuthenticator;
import com.my.billiards.common.websocket.WebSocketTicketPurpose;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandshakeInterceptor implements HandshakeInterceptor {

	private final WebSocketTicketAuthenticator ticketAuthenticator;

	@Override
	public boolean beforeHandshake(
		ServerHttpRequest request,
		ServerHttpResponse response,
		WebSocketHandler wsHandler,
		Map<String, Object> attributes
	) {
		Long memberId = ticketAuthenticator.authenticate(
			request,
			response,
			WebSocketTicketPurpose.NOTIFICATIONS,
			null
		);
		if (memberId == null) {
			return false;
		}

		attributes.put(NotificationWebSocketAttributes.MEMBER_ID, memberId);
		return true;
	}

	@Override
	public void afterHandshake(
		ServerHttpRequest request,
		ServerHttpResponse response,
		WebSocketHandler wsHandler,
		Exception exception
	) {
	}
}
