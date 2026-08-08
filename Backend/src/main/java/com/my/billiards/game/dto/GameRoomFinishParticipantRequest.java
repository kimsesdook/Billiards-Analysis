package com.my.billiards.game.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;

public record GameRoomFinishParticipantRequest(
    @NotNull
    Long memberId,

    @NotEmpty
    @Size(max = 500)
    List<@NotNull @PositiveOrZero Integer> inningScores,

    @Min(1)
    @Max(2)
    Integer teamNumber
) {
}
