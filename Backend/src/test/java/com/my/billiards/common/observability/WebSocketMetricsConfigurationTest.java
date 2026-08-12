package com.my.billiards.common.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.my.billiards.game.websocket.GameRoomWebSocketSessionRegistry;
import com.my.billiards.notification.websocket.NotificationWebSocketSessionRegistry;
import io.micrometer.core.instrument.binder.MeterBinder;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.WebSocketSession;

class WebSocketMetricsConfigurationTest {

	@Test
	void exposesCurrentConnectionCountsByChannel() {
		NotificationWebSocketSessionRegistry notificationSessions =
			new NotificationWebSocketSessionRegistry();
		GameRoomWebSocketSessionRegistry gameRoomSessions = new GameRoomWebSocketSessionRegistry();
		WebSocketSession firstNotificationSession = mock(WebSocketSession.class);
		WebSocketSession secondNotificationSession = mock(WebSocketSession.class);
		WebSocketSession gameRoomSession = mock(WebSocketSession.class);
		when(firstNotificationSession.isOpen()).thenReturn(true);
		when(secondNotificationSession.isOpen()).thenReturn(true);
		when(gameRoomSession.isOpen()).thenReturn(true);
		notificationSessions.register(1L, firstNotificationSession);
		notificationSessions.register(2L, secondNotificationSession);
		gameRoomSessions.register(10L, gameRoomSession);
		SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
		MeterBinder meterBinder = new WebSocketMetricsConfiguration()
			.webSocketConnectionMetrics(notificationSessions, gameRoomSessions);
		meterBinder.bindTo(meterRegistry);

		assertThat(meterRegistry.get("billiards.websocket.connections.active")
			.tag("channel", "notifications").gauge().value()).isEqualTo(2);
		assertThat(meterRegistry.get("billiards.websocket.connections.active")
			.tag("channel", "game_room").gauge().value()).isEqualTo(1);

		notificationSessions.unregister(1L, firstNotificationSession);

		assertThat(meterRegistry.get("billiards.websocket.connections.active")
			.tag("channel", "notifications").gauge().value()).isEqualTo(1);
	}
}
