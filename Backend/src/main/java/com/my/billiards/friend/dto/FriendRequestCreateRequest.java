package com.my.billiards.friend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record FriendRequestCreateRequest(
	@NotNull(message = "친구 요청 대상은 필수입니다.")
	@Positive(message = "친구 요청 대상이 올바르지 않습니다.")
	Long targetMemberId
) {
}
