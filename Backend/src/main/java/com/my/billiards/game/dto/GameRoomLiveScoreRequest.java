package com.my.billiards.game.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record GameRoomLiveScoreRequest(
    @NotNull(message = "Member id is required.")
    Long memberId,

    @NotNull(message = "Current score is required.")
    @PositiveOrZero(message = "Current score must be zero or greater.")
    Integer currentScore,

    @NotNull(message = "Cushion score is required.")
    @PositiveOrZero(message = "Cushion score must be zero or greater.")
    Integer cushionScore,

    @NotNull(message = "High run is required.")
    @PositiveOrZero(message = "High run must be zero or greater.")
    Integer highRun
) {
}
