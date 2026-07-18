package com.my.billiards.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(
	@NotBlank(message = "현재 비밀번호는 필수입니다.")
	String currentPassword,

	@NotBlank(message = "새 비밀번호는 필수입니다.")
	@Size(min = 8, max = 100, message = "새 비밀번호는 8자 이상 100자 이하로 입력해 주세요.")
	String newPassword
) {
}
