package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameRoomParticipant;
import com.my.billiards.game.domain.GameRoomParticipantRole;

public record GameRoomParticipantResponse(
    Long memberId,
    String nickname,
    GameRoomParticipantRole role,
    int targetScore,
    boolean ready
) {

    public static GameRoomParticipantResponse from(GameRoomParticipant participant) {
        return new GameRoomParticipantResponse(
            participant.getMember().getId(),
            participant.getMember().getNickname(),
            participant.getRole(),
            participant.getTargetScore(),
            participant.isReady()
        );
    }
}
