package com.my.billiards.invitation.dto;

import com.my.billiards.member.domain.Member;

public record GameInvitationMemberResponse(
	Long id,
	String name,
	String nickname,
	int targetCushionCount,
	int threeBallHandicap,
	int fourBallHandicap
) {

	public static GameInvitationMemberResponse from(Member member) {
		return new GameInvitationMemberResponse(
			member.getId(),
			member.getDisplayName(),
			member.getNickname(),
			member.getTargetCushionCount(),
			member.getThreeBallHandicap(),
			member.getFourBallHandicap()
		);
	}
}
