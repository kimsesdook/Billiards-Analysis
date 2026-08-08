package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameRoomParticipant;

public record GameRoomLiveScoreResponse(
    Long memberId,
    String nickname,
    int targetScore,
    int currentScore,
    int cushionScore,
    int highRun
) {

    public static GameRoomLiveScoreResponse from(GameRoomParticipant participant) {
        return new GameRoomLiveScoreResponse(
            participant.getMember().getId(),
            participant.getMember().getNickname(),
            participant.getTargetScore(),
            participant.getCurrentScore(),
            participant.getCushionScore(),
            participant.getHighRun()
        );
    }
}
