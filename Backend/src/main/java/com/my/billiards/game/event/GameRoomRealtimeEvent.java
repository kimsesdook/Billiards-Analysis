package com.my.billiards.game.event;

import com.my.billiards.game.dto.GameRoomResponse;

public record GameRoomRealtimeEvent(
    Long roomId,
    GameRoomRealtimeEventType eventType,
    GameRoomResponse gameRoom
) {
}
