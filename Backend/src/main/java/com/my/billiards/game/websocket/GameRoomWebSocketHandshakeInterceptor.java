package com.my.billiards.game.websocket;

import com.my.billiards.common.websocket.WebSocketTicketAuthenticator;
import com.my.billiards.common.websocket.WebSocketTicketPurpose;
import com.my.billiards.game.repository.GameRoomRepository;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class GameRoomWebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final WebSocketTicketAuthenticator ticketAuthenticator;
    private final GameRoomRepository gameRoomRepository;

    @Override
    public boolean beforeHandshake(
        ServerHttpRequest request,
        ServerHttpResponse response,
        WebSocketHandler wsHandler,
        Map<String, Object> attributes
    ) {
        Long roomId = resolveRoomId(request, response);
        if (roomId == null) {
            return false;
        }
        Long memberId = ticketAuthenticator.authenticate(
            request,
            response,
            WebSocketTicketPurpose.GAME_ROOM,
            roomId
        );
        if (memberId == null) {
            return false;
        }
        if (!gameRoomRepository.existsByIdAndParticipants_Member_Id(roomId, memberId)) {
            response.setStatusCode(HttpStatus.FORBIDDEN);
            return false;
        }

        attributes.put(GameRoomWebSocketAttributes.MEMBER_ID, memberId);
        attributes.put(GameRoomWebSocketAttributes.ROOM_ID, roomId);
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

    private Long resolveRoomId(ServerHttpRequest request, ServerHttpResponse response) {
        String path = request.getURI().getPath();
        String roomIdValue = path.substring(path.lastIndexOf('/') + 1);

        try {
            return Long.valueOf(roomIdValue);
        } catch (NumberFormatException exception) {
            response.setStatusCode(HttpStatus.BAD_REQUEST);
            return null;
        }
    }
}
