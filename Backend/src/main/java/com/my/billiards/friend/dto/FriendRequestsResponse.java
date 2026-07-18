package com.my.billiards.friend.dto;

import java.util.List;

public record FriendRequestsResponse(
	List<FriendRequestResponse> incoming,
	List<FriendRequestResponse> outgoing
) {
}
