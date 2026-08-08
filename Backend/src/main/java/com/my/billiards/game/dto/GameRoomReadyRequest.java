package com.my.billiards.game.dto;

import jakarta.validation.constraints.NotNull;

public record GameRoomReadyRequest(
    @NotNull(message = "준비 상태는 필수입니다.")
    Boolean ready
) {
}
