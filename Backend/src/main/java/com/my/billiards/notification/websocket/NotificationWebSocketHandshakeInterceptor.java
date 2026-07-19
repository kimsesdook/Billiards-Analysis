package com.my.billiards.notification.websocket;

import com.my.billiards.auth.token.JwtTokenProvider;
import com.my.billiards.auth.token.JwtTokenProvider.JwtClaims;
import com.my.billiards.common.error.BilliardsException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandshakeInterceptor implements HandshakeInterceptor {

	private final JwtTokenProvider jwtTokenProvider;

	@Override
	public boolean beforeHandshake(
		ServerHttpRequest request,
		ServerHttpResponse response,
		WebSocketHandler wsHandler,
		Map<String, Object> attributes
	) {
		String token = UriComponentsBuilder.fromUri(request.getURI())
			.build()
			.getQueryParams()
			.getFirst("token");

		if (token == null || token.isBlank()) {
			response.setStatusCode(HttpStatus.UNAUTHORIZED);
			return false;
		}

		try {
			JwtClaims claims = jwtTokenProvider.parse(token);
			attributes.put(NotificationWebSocketAttributes.MEMBER_ID, claims.memberId());
			return true;
		} catch (BilliardsException exception) {
			response.setStatusCode(HttpStatus.UNAUTHORIZED);
			return false;
		}
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
