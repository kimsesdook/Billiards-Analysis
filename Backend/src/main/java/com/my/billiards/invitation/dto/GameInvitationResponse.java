package com.my.billiards.invitation.dto;

import com.my.billiards.game.domain.GameType;
import com.my.billiards.invitation.domain.GameInvitation;
import com.my.billiards.invitation.domain.GameInvitationStatus;
import com.my.billiards.member.domain.Member;
import java.time.LocalDateTime;

public record GameInvitationResponse(
	Long invitationId,
	GameInvitationMemberResponse member,
	GameType gameType,
	GameInvitationStatus status,
	GameInvitationDirection direction,
	LocalDateTime createdAt,
	LocalDateTime expiresAt,
	LocalDateTime respondedAt
) {

	public static GameInvitationResponse incoming(GameInvitation invitation) {
		return of(invitation, invitation.getRequester(), GameInvitationDirection.INCOMING);
	}

	public static GameInvitationResponse outgoing(GameInvitation invitation) {
		return of(invitation, invitation.getReceiver(), GameInvitationDirection.OUTGOING);
	}

	private static GameInvitationResponse of(
		GameInvitation invitation,
		Member member,
		GameInvitationDirection direction
	) {
		return new GameInvitationResponse(
			invitation.getId(),
			GameInvitationMemberResponse.from(member),
			invitation.getGameType(),
			invitation.getStatus(),
			direction,
			invitation.getCreatedAt(),
			invitation.getExpiresAt(),
			invitation.getRespondedAt()
		);
	}
}
