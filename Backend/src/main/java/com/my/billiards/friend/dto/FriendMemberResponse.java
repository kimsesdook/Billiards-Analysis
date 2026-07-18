package com.my.billiards.friend.dto;

import com.my.billiards.member.domain.Member;

public record FriendMemberResponse(
	Long id,
	String name,
	String nickname,
	int targetCushionCount,
	int threeBallHandicap,
	int fourBallHandicap
) {

	public static FriendMemberResponse from(Member member) {
		return new FriendMemberResponse(
			member.getId(),
			member.getDisplayName(),
			member.getNickname(),
			member.getTargetCushionCount(),
			member.getThreeBallHandicap(),
			member.getFourBallHandicap()
		);
	}
}
