package com.my.billiards.invitation.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.my.billiards.game.domain.GameType;
import com.my.billiards.member.domain.Member;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class GameInvitationTest {

	@Test
	void expiresOnlyPendingInvitationAtExpirationTime() {
		GameInvitation invitation = GameInvitation.create(
			Member.create("requester@example.com", "password-hash", "Requester"),
			Member.create("receiver@example.com", "password-hash", "Receiver"),
			GameType.THREE_CUSHION,
			LocalDateTime.of(2026, 8, 2, 10, 0)
		);

		invitation.expireIfNeeded(LocalDateTime.of(2026, 8, 2, 10, 0));

		assertThat(invitation.getStatus()).isEqualTo(GameInvitationStatus.EXPIRED);
	}

	@Test
	void acceptedInvitationDoesNotExpireAfterItsExpirationTime() {
		GameInvitation invitation = GameInvitation.create(
			Member.create("requester@example.com", "password-hash", "Requester"),
			Member.create("receiver@example.com", "password-hash", "Receiver"),
			GameType.FOUR_BALL,
			LocalDateTime.of(2026, 8, 2, 10, 0)
		);

		invitation.accept(LocalDateTime.of(2026, 8, 2, 9, 30));
		invitation.expireIfNeeded(LocalDateTime.of(2026, 8, 2, 11, 0));

		assertThat(invitation.getStatus()).isEqualTo(GameInvitationStatus.ACCEPTED);
		assertThat(invitation.getRespondedAt()).isEqualTo(LocalDateTime.of(2026, 8, 2, 9, 30));
	}
}
