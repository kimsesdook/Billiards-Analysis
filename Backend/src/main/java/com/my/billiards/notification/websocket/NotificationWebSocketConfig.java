package com.my.billiards.notification.websocket;

import com.my.billiards.config.BilliardsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class NotificationWebSocketConfig implements WebSocketConfigurer {

	private final BilliardsProperties properties;
	private final NotificationWebSocketHandler notificationWebSocketHandler;
	private final NotificationWebSocketHandshakeInterceptor notificationWebSocketHandshakeInterceptor;

	@Override
	public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
		registry.addHandler(notificationWebSocketHandler, "/ws/notifications")
			.addInterceptors(notificationWebSocketHandshakeInterceptor)
			.setAllowedOrigins(properties.getCors().getAllowedOrigins().toArray(new String[0]));
	}
}
