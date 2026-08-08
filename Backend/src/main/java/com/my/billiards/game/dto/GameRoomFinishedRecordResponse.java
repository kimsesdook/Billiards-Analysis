package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameRecord;

public record GameRoomFinishedRecordResponse(
    Long memberId,
    String nickname,
    Long gameRecordId,
    int score,
    int opponentScore,
    Integer rank,
    boolean win
) {

    public static GameRoomFinishedRecordResponse from(GameRecord record) {
        return new GameRoomFinishedRecordResponse(
            record.getMember().getId(),
            record.getMember().getNickname(),
            record.getId(),
            record.getMyScore(),
            record.getOpponentScore(),
            record.getRank(),
            record.isWin()
        );
    }
}
