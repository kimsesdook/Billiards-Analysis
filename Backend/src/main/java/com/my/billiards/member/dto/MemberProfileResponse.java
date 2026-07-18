package com.my.billiards.member.dto;

import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;

public record MemberProfileResponse(
	Long id,
	String email,
	String name,
	String nickname,
	MemberRole role,
	int targetCushionCount,
	int threeBallHandicap,
	int fourBallHandicap
) {

	public static MemberProfileResponse from(Member member) {
		return new MemberProfileResponse(
			member.getId(),
			member.getEmail(),
			member.getDisplayName(),
			member.getNickname(),
			member.getRole(),
			member.getTargetCushionCount(),
			member.getThreeBallHandicap(),
			member.getFourBallHandicap()
		);
	}
}
