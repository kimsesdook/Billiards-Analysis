package com.my.billiards.game.websocket;

import com.my.billiards.config.BilliardsProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@RequiredArgsConstructor
public class GameRoomWebSocketConfig implements WebSocketConfigurer {

    private final BilliardsProperties properties;
    private final GameRoomWebSocketHandler gameRoomWebSocketHandler;
    private final GameRoomWebSocketHandshakeInterceptor gameRoomWebSocketHandshakeInterceptor;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(gameRoomWebSocketHandler, "/ws/game-rooms/{roomId}")
            .addInterceptors(gameRoomWebSocketHandshakeInterceptor)
            .setAllowedOrigins(properties.getCors().getAllowedOrigins().toArray(new String[0]));
    }
}
