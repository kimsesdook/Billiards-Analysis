package com.my.billiards.game.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

public record GameRoomLiveStateUpdateRequest(
    @NotNull(message = "State version is required.")
    @PositiveOrZero(message = "State version must be zero or greater.")
    Long stateVersion,

    @NotNull(message = "Current inning is required.")
    @Positive(message = "Current inning must be greater than zero.")
    Integer currentInning,

    @NotNull(message = "Active member id is required.")
    Long activeMemberId,

    @NotEmpty(message = "Live scores are required.")
    @Size(max = 4, message = "Live scores cannot contain more than four participants.")
    List<@Valid GameRoomLiveScoreRequest> scores
) {
}
