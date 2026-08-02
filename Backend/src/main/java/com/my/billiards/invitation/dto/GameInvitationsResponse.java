package com.my.billiards.invitation.dto;

import java.util.List;

public record GameInvitationsResponse(
	List<GameInvitationResponse> incoming,
	List<GameInvitationResponse> outgoing
) {
}
