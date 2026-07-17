package com.my.billiards.auth.dto;

import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;

public record SignUpResponse(
	Long id,
	String email,
	String nickname,
	MemberRole role
) {

	public static SignUpResponse from(Member member) {
		return new SignUpResponse(
			member.getId(),
			member.getEmail(),
			member.getNickname(),
			member.getRole()
		);
	}
}
