package com.my.billiards.invitation.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.member.domain.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
@Entity
@Table(name = "game_invitations")
public class GameInvitation extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "requester_id", nullable = false)
	private Member requester;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "receiver_id", nullable = false)
	private Member receiver;

	@Enumerated(EnumType.STRING)
	@Column(name = "game_type", nullable = false, length = 30)
	private GameType gameType;

	@Enumerated(EnumType.STRING)
	@Column(name = "invitation_status", nullable = false, length = 30)
	private GameInvitationStatus status;

	@Column(name = "expires_at", nullable = false)
	private LocalDateTime expiresAt;

	@Column(name = "responded_at")
	private LocalDateTime respondedAt;

	protected GameInvitation() {
	}

	private GameInvitation(Member requester, Member receiver, GameType gameType, LocalDateTime expiresAt) {
		this.requester = requester;
		this.receiver = receiver;
		this.gameType = gameType;
		this.status = GameInvitationStatus.PENDING;
		this.expiresAt = expiresAt;
	}

	public static GameInvitation create(
		Member requester,
		Member receiver,
		GameType gameType,
		LocalDateTime expiresAt
	) {
		return new GameInvitation(requester, receiver, gameType, expiresAt);
	}

	public void accept(LocalDateTime respondedAt) {
		this.status = GameInvitationStatus.ACCEPTED;
		this.respondedAt = respondedAt;
	}

	public void decline(LocalDateTime respondedAt) {
		this.status = GameInvitationStatus.DECLINED;
		this.respondedAt = respondedAt;
	}

	public void expireIfNeeded(LocalDateTime now) {
		if (status == GameInvitationStatus.PENDING && !expiresAt.isAfter(now)) {
			this.status = GameInvitationStatus.EXPIRED;
		}
	}

	public boolean isRequester(Long memberId) {
		return requester.getId().equals(memberId);
	}

	public boolean isReceiver(Long memberId) {
		return receiver.getId().equals(memberId);
	}
}
