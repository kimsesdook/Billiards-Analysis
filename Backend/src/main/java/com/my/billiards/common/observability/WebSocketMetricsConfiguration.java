package com.my.billiards.common.observability;

import com.my.billiards.game.websocket.GameRoomWebSocketSessionRegistry;
import com.my.billiards.notification.websocket.NotificationWebSocketSessionRegistry;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.binder.MeterBinder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WebSocketMetricsConfiguration {

	@Bean
	public MeterBinder webSocketConnectionMetrics(
		NotificationWebSocketSessionRegistry notificationSessions,
		GameRoomWebSocketSessionRegistry gameRoomSessions
	) {
		return registry -> {
			Gauge.builder(
				"billiards.websocket.connections.active",
				notificationSessions,
				NotificationWebSocketSessionRegistry::activeSessionCount
			)
				.description("Current active WebSocket connections by channel.")
				.tag("channel", "notifications")
				.register(registry);
			Gauge.builder(
				"billiards.websocket.connections.active",
				gameRoomSessions,
				GameRoomWebSocketSessionRegistry::activeSessionCount
			)
				.description("Current active WebSocket connections by channel.")
				.tag("channel", "game_room")
				.register(registry);
		};
	}
}
