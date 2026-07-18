package com.my.billiards.friend.dto;

import com.my.billiards.friend.domain.Friendship;
import com.my.billiards.member.domain.Member;
import java.time.LocalDateTime;

public record FriendResponse(
	Long friendshipId,
	FriendMemberResponse friend,
	LocalDateTime friendsSince
) {

	public static FriendResponse of(Friendship friendship, Member friend) {
		return new FriendResponse(
			friendship.getId(),
			FriendMemberResponse.from(friend),
			friendship.getUpdatedAt()
		);
	}
}
