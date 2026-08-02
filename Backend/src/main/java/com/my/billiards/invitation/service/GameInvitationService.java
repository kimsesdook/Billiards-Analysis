package com.my.billiards.invitation.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.friend.domain.FriendshipStatus;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.invitation.domain.GameInvitation;
import com.my.billiards.invitation.domain.GameInvitationStatus;
import com.my.billiards.invitation.dto.GameInvitationCreateRequest;
import com.my.billiards.invitation.dto.GameInvitationResponse;
import com.my.billiards.invitation.dto.GameInvitationsResponse;
import com.my.billiards.invitation.repository.GameInvitationRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notification.domain.NotificationType;
import com.my.billiards.notification.service.NotificationService;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GameInvitationService {

	private static final int INVITATION_EXPIRATION_MINUTES = 10;

	private final GameInvitationRepository gameInvitationRepository;
	private final FriendshipRepository friendshipRepository;
	private final MemberRepository memberRepository;
	private final NotificationService notificationService;

	@Transactional
	public GameInvitationResponse create(Long memberId, GameInvitationCreateRequest request) {
		if (memberId.equals(request.receiverMemberId())) {
			throw new BilliardsException(ErrorCode.SELF_GAME_INVITATION);
		}

		Member requester = getActiveMember(memberId);
		Member receiver = getActiveMember(request.receiverMemberId());
		validateAcceptedFriendship(memberId, receiver.getId());

		LocalDateTime now = LocalDateTime.now();
		List<GameInvitation> pendingInvitations = gameInvitationRepository
			.findByRequester_IdAndReceiver_IdAndStatus(
				requester.getId(),
				receiver.getId(),
				GameInvitationStatus.PENDING
			);
		pendingInvitations.forEach(invitation -> invitation.expireIfNeeded(now));

		if (pendingInvitations.stream().anyMatch(invitation -> invitation.getStatus() == GameInvitationStatus.PENDING)) {
			throw new BilliardsException(ErrorCode.GAME_INVITATION_ALREADY_PENDING);
		}

		GameInvitation invitation = gameInvitationRepository.save(GameInvitation.create(
			requester,
			receiver,
			request.gameType(),
			now.plusMinutes(INVITATION_EXPIRATION_MINUTES)
		));
		notificationService.createForMember(
			receiver,
			NotificationType.MATCH,
			"새 경기 초대",
			requester.getNickname() + "님이 " + request.gameType().getValue() + " 경기 초대를 보냈습니다.",
			"GAME_INVITATION",
			invitation.getId()
		);

		return GameInvitationResponse.outgoing(invitation);
	}

	@Transactional
	public GameInvitationsResponse findPending(Long memberId) {
		LocalDateTime now = LocalDateTime.now();
		List<GameInvitation> invitations = gameInvitationRepository
			.findByMemberIdAndStatus(memberId, GameInvitationStatus.PENDING);
		invitations.forEach(invitation -> invitation.expireIfNeeded(now));

		List<GameInvitationResponse> incoming = invitations.stream()
			.filter(invitation -> invitation.getStatus() == GameInvitationStatus.PENDING)
			.filter(invitation -> invitation.isReceiver(memberId))
			.map(GameInvitationResponse::incoming)
			.toList();
		List<GameInvitationResponse> outgoing = invitations.stream()
			.filter(invitation -> invitation.getStatus() == GameInvitationStatus.PENDING)
			.filter(invitation -> invitation.isRequester(memberId))
			.map(GameInvitationResponse::outgoing)
			.toList();

		return new GameInvitationsResponse(incoming, outgoing);
	}

	@Transactional
	public GameInvitationResponse accept(Long memberId, Long invitationId) {
		GameInvitation invitation = getInvitation(invitationId);
		validateReceiver(memberId, invitation);
		validatePendingInvitation(invitation);

		invitation.accept(LocalDateTime.now());
		notificationService.createForMember(
			invitation.getRequester(),
			NotificationType.MATCH,
			"경기 초대 수락",
			invitation.getReceiver().getNickname() + "님이 경기 초대를 수락했습니다.",
			"GAME_INVITATION",
			invitation.getId()
		);

		return GameInvitationResponse.incoming(invitation);
	}

	@Transactional
	public GameInvitationResponse decline(Long memberId, Long invitationId) {
		GameInvitation invitation = getInvitation(invitationId);
		validateReceiver(memberId, invitation);
		validatePendingInvitation(invitation);

		invitation.decline(LocalDateTime.now());
		return GameInvitationResponse.incoming(invitation);
	}

	private void validateAcceptedFriendship(Long requesterId, Long receiverId) {
		long memberLowId = Math.min(requesterId, receiverId);
		long memberHighId = Math.max(requesterId, receiverId);
		boolean isAcceptedFriendship = friendshipRepository.findByMemberPair(memberLowId, memberHighId)
			.map(friendship -> friendship.getStatus() == FriendshipStatus.ACCEPTED)
			.orElse(false);

		if (!isAcceptedFriendship) {
			throw new BilliardsException(ErrorCode.GAME_INVITATION_ONLY_FOR_FRIENDS);
		}
	}

	private void validateReceiver(Long memberId, GameInvitation invitation) {
		if (!invitation.isReceiver(memberId)) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}
	}

	private void validatePendingInvitation(GameInvitation invitation) {
		invitation.expireIfNeeded(LocalDateTime.now());
		if (invitation.getStatus() == GameInvitationStatus.EXPIRED) {
			throw new BilliardsException(ErrorCode.GAME_INVITATION_EXPIRED);
		}
		if (invitation.getStatus() != GameInvitationStatus.PENDING) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "대기 중인 경기 초대만 처리할 수 있습니다.");
		}
	}

	private GameInvitation getInvitation(Long invitationId) {
		return gameInvitationRepository.findDetailById(invitationId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND, "경기 초대를 찾을 수 없습니다."));
	}

	private Member getActiveMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND, "회원을 찾을 수 없습니다."));

		if (member.getStatus() != MemberStatus.ACTIVE) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return member;
	}
}
