package com.my.billiards.auth.dto;

import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;

public record AuthMemberResponse(
	Long id,
	String email,
	String nickname,
	MemberRole role
) {

	public static AuthMemberResponse from(Member member) {
		return new AuthMemberResponse(
			member.getId(),
			member.getEmail(),
			member.getNickname(),
			member.getRole()
		);
	}
}
