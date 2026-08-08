package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameRoom;
import com.my.billiards.game.domain.GameRoomStatus;
import java.util.List;

public record GameRoomLiveStateResponse(
    Long roomId,
    GameRoomStatus status,
    long stateVersion,
    int currentInning,
    Long activeMemberId,
    List<GameRoomLiveScoreResponse> scores
) {

    public static GameRoomLiveStateResponse from(GameRoom gameRoom) {
        return new GameRoomLiveStateResponse(
            gameRoom.getId(),
            gameRoom.getStatus(),
            gameRoom.getStateVersion(),
            gameRoom.getCurrentInning(),
            gameRoom.getActiveMemberId(),
            gameRoom.getParticipants().stream().map(GameRoomLiveScoreResponse::from).toList()
        );
    }
}
