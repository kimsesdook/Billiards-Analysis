package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameRoom;
import com.my.billiards.game.domain.GameRoomStatus;
import com.my.billiards.game.domain.GameType;
import java.time.LocalDateTime;
import java.util.List;

public record GameRoomResponse(
    Long roomId,
    String name,
    String joinCode,
    Long hostMemberId,
    String hostNickname,
    GameType gameType,
    GameMode gameMode,
    int playerCapacity,
    GameRoomStatus status,
    List<GameRoomParticipantResponse> participants,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

    public static GameRoomResponse from(GameRoom gameRoom) {
        return new GameRoomResponse(
            gameRoom.getId(),
            gameRoom.getName(),
            gameRoom.getJoinCode(),
            gameRoom.getHost().getId(),
            gameRoom.getHost().getNickname(),
            gameRoom.getGameType(),
            gameRoom.getGameMode(),
            gameRoom.getPlayerCapacity(),
            gameRoom.getStatus(),
            gameRoom.getParticipants().stream().map(GameRoomParticipantResponse::from).toList(),
            gameRoom.getCreatedAt(),
            gameRoom.getUpdatedAt()
        );
    }
}
