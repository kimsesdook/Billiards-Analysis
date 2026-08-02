package com.my.billiards.invitation.dto;

import com.my.billiards.game.domain.GameType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record GameInvitationCreateRequest(
	@NotNull(message = "경기 초대 대상은 필수입니다.")
	@Positive(message = "경기 초대 대상이 올바르지 않습니다.")
	Long receiverMemberId,
	@NotNull(message = "경기 종류는 필수입니다.")
	GameType gameType
) {
}
