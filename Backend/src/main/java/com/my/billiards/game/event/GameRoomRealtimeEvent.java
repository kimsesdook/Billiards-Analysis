package com.my.billiards.game.event;

import com.my.billiards.game.dto.GameRoomLiveStateResponse;
import com.my.billiards.game.dto.GameRoomResponse;

public record GameRoomRealtimeEvent(
    Long roomId,
    GameRoomRealtimeEventType eventType,
    GameRoomResponse gameRoom,
    GameRoomLiveStateResponse liveState
) {

    public GameRoomRealtimeEvent(
        Long roomId,
        GameRoomRealtimeEventType eventType,
        GameRoomResponse gameRoom
    ) {
        this(roomId, eventType, gameRoom, null);
    }

    public static GameRoomRealtimeEvent liveStateChanged(GameRoomLiveStateResponse liveState) {
        return new GameRoomRealtimeEvent(
            liveState.roomId(),
            GameRoomRealtimeEventType.LIVE_STATE_CHANGED,
            null,
            liveState
        );
    }
}
