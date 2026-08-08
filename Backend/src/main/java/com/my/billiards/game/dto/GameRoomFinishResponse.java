package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.domain.GameRoom;
import com.my.billiards.game.domain.GameRoomStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record GameRoomFinishResponse(
    Long roomId,
    GameRoomStatus status,
    long stateVersion,
    OffsetDateTime playedAt,
    List<GameRoomFinishedRecordResponse> records
) {

    public static GameRoomFinishResponse from(GameRoom gameRoom, List<GameRecord> records) {
        OffsetDateTime playedAt = records.isEmpty() ? null : records.get(0).getPlayedAt();
        return new GameRoomFinishResponse(
            gameRoom.getId(),
            gameRoom.getStatus(),
            gameRoom.getStateVersion(),
            playedAt,
            records.stream().map(GameRoomFinishedRecordResponse::from).toList()
        );
    }
}
