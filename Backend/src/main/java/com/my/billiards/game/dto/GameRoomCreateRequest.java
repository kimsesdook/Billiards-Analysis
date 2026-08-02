package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record GameRoomCreateRequest(
    @NotBlank(message = "게임방 이름은 필수입니다.")
    @Size(max = 50, message = "게임방 이름은 50자 이하여야 합니다.")
    String name,
    @NotNull(message = "경기 종류는 필수입니다.")
    GameType gameType,
    @NotNull(message = "경기 모드는 필수입니다.")
    GameMode gameMode,
    @Min(value = 2, message = "참가 인원은 2명 이상이어야 합니다.")
    @Max(value = 4, message = "참가 인원은 4명 이하여야 합니다.")
    int playerCapacity,
    @Min(value = 1, message = "방장 목표 점수는 1점 이상이어야 합니다.")
    @Max(value = 1000, message = "방장 목표 점수는 1000점 이하여야 합니다.")
    int hostTargetScore
) {
}
