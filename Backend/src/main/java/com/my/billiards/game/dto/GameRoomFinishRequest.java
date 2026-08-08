package com.my.billiards.game.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.List;

public record GameRoomFinishRequest(
    @NotNull
    @PositiveOrZero
    Long stateVersion,

    @NotNull
    @Min(0)
    @Max(2)
    Integer lastThreeCushions,

    @NotEmpty
    List<@Valid GameRoomFinishParticipantRequest> participants
) {
}
