package com.my.billiards.game.dto;

import com.my.billiards.game.event.GameRoomRealtimeEventType;

public record GameRoomRealtimeMessage(
    String eventType,
    Long roomId,
    GameRoomResponse gameRoom
) {

    public static GameRoomRealtimeMessage connected(Long roomId) {
        return new GameRoomRealtimeMessage("CONNECTED", roomId, null);
    }

    public static GameRoomRealtimeMessage event(
        GameRoomRealtimeEventType eventType,
        Long roomId,
        GameRoomResponse gameRoom
    ) {
        return new GameRoomRealtimeMessage(eventType.name(), roomId, gameRoom);
    }
}
