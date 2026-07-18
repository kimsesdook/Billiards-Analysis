package com.my.billiards.friend.dto;

import com.my.billiards.member.domain.Member;

public record FriendSearchResponse(
	Long memberId,
	String name,
	String nickname,
	int targetCushionCount,
	int threeBallHandicap,
	int fourBallHandicap,
	FriendSearchStatus relationshipStatus
) {

	public static FriendSearchResponse of(Member member, FriendSearchStatus relationshipStatus) {
		return new FriendSearchResponse(
			member.getId(),
			member.getDisplayName(),
			member.getNickname(),
			member.getTargetCushionCount(),
			member.getThreeBallHandicap(),
			member.getFourBallHandicap(),
			relationshipStatus
		);
	}
}
