package com.my.billiards.member.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MemberProfileUpdateRequest(
	@NotBlank(message = "이름은 필수입니다.")
	@Size(max = 30, message = "이름은 30자 이하로 입력해 주세요.")
	String name,

	@NotBlank(message = "닉네임은 필수입니다.")
	@Size(max = 30, message = "닉네임은 30자 이하로 입력해 주세요.")
	String nickname,

	@NotNull(message = "마무리 3쿠션 기준은 필수입니다.")
	@Min(value = 0, message = "마무리 3쿠션 기준은 0 이상이어야 합니다.")
	@Max(value = 2, message = "마무리 3쿠션 기준은 2 이하이어야 합니다.")
	Integer targetCushionCount,

	@NotNull(message = "3구 수지는 필수입니다.")
	@Min(value = 50, message = "3구 수지는 50 이상이어야 합니다.")
	@Max(value = 1000, message = "3구 수지는 1000 이하이어야 합니다.")
	Integer threeBallHandicap,

	@NotNull(message = "4구 수지는 필수입니다.")
	@Min(value = 50, message = "4구 수지는 50 이상이어야 합니다.")
	@Max(value = 1000, message = "4구 수지는 1000 이하이어야 합니다.")
	Integer fourBallHandicap
) {
}
