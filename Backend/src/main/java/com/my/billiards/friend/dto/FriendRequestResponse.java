package com.my.billiards.friend.dto;

import com.my.billiards.friend.domain.Friendship;
import com.my.billiards.member.domain.Member;
import java.time.LocalDateTime;

public record FriendRequestResponse(
	Long requestId,
	FriendMemberResponse member,
	FriendRequestDirection direction,
	LocalDateTime requestedAt
) {

	public static FriendRequestResponse incoming(Friendship friendship) {
		return of(friendship, friendship.getRequester(), FriendRequestDirection.INCOMING);
	}

	public static FriendRequestResponse outgoing(Friendship friendship) {
		return of(friendship, friendship.getReceiver(), FriendRequestDirection.OUTGOING);
	}

	private static FriendRequestResponse of(
		Friendship friendship,
		Member member,
		FriendRequestDirection direction
	) {
		return new FriendRequestResponse(
			friendship.getId(),
			FriendMemberResponse.from(member),
			direction,
			friendship.getCreatedAt()
		);
	}
}
