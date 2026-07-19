package com.my.billiards.friend.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.friend.domain.Friendship;
import com.my.billiards.friend.domain.FriendshipStatus;
import com.my.billiards.friend.dto.FriendRequestCreateRequest;
import com.my.billiards.friend.dto.FriendRequestResponse;
import com.my.billiards.friend.dto.FriendRequestsResponse;
import com.my.billiards.friend.dto.FriendResponse;
import com.my.billiards.friend.dto.FriendSearchResponse;
import com.my.billiards.friend.dto.FriendSearchStatus;
import com.my.billiards.friend.repository.FriendshipRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import com.my.billiards.notification.domain.NotificationType;
import com.my.billiards.notification.service.NotificationService;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FriendService {

	private static final int SEARCH_LIMIT = 10;

	private final FriendshipRepository friendshipRepository;
	private final MemberRepository memberRepository;
	private final NotificationService notificationService;

	@Transactional(readOnly = true)
	public List<FriendResponse> findFriends(Long memberId) {
		return friendshipRepository.findByMemberIdAndStatus(memberId, FriendshipStatus.ACCEPTED)
			.stream()
			.map(friendship -> FriendResponse.of(friendship, friendship.getOtherMember(memberId)))
			.toList();
	}

	@Transactional(readOnly = true)
	public FriendRequestsResponse findRequests(Long memberId) {
		List<FriendRequestResponse> incoming = friendshipRepository
			.findReceivedByMemberIdAndStatus(memberId, FriendshipStatus.PENDING)
			.stream()
			.map(FriendRequestResponse::incoming)
			.toList();

		List<FriendRequestResponse> outgoing = friendshipRepository
			.findSentByMemberIdAndStatus(memberId, FriendshipStatus.PENDING)
			.stream()
			.map(FriendRequestResponse::outgoing)
			.toList();

		return new FriendRequestsResponse(incoming, outgoing);
	}

	@Transactional(readOnly = true)
	public List<FriendSearchResponse> searchMembers(Long memberId, String keyword) {
		String normalizedKeyword = keyword == null ? "" : keyword.strip();
		if (normalizedKeyword.isBlank()) {
			return List.of();
		}

		Map<Long, Friendship> relationsByMemberId = friendshipRepository.findAllByMemberId(memberId)
			.stream()
			.collect(Collectors.toMap(
				friendship -> friendship.getOtherMember(memberId).getId(),
				Function.identity()
			));

		return memberRepository.searchActiveMembers(
				memberId,
				MemberStatus.ACTIVE,
				normalizedKeyword,
				PageRequest.of(0, SEARCH_LIMIT)
			)
			.stream()
			.map(member -> FriendSearchResponse.of(
				member,
				resolveSearchStatus(memberId, relationsByMemberId.get(member.getId()))
			))
			.toList();
	}

	@Transactional
	public FriendRequestResponse sendRequest(Long memberId, FriendRequestCreateRequest request) {
		if (memberId.equals(request.targetMemberId())) {
			throw new BilliardsException(ErrorCode.SELF_FRIEND_REQUEST);
		}

		Member requester = getActiveMember(memberId);
		Member receiver = getActiveMember(request.targetMemberId());
		long memberLowId = Math.min(memberId, request.targetMemberId());
		long memberHighId = Math.max(memberId, request.targetMemberId());

		friendshipRepository.findByMemberPair(memberLowId, memberHighId)
			.ifPresent(friendship -> {
				throw new BilliardsException(ErrorCode.FRIENDSHIP_ALREADY_EXISTS);
			});

		Friendship friendship = friendshipRepository.save(Friendship.request(requester, receiver));
		notificationService.createForMember(
			receiver,
			NotificationType.FRIEND,
			"새 친구 요청",
			requester.getNickname() + "님이 친구 요청을 보냈습니다.",
			"FRIEND_REQUEST",
			friendship.getId()
		);

		return FriendRequestResponse.outgoing(friendship);
	}

	@Transactional
	public FriendResponse acceptRequest(Long memberId, Long requestId) {
		Friendship friendship = getFriendship(requestId);
		if (!friendship.isReceiver(memberId)) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}
		if (friendship.getStatus() != FriendshipStatus.PENDING) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "대기 중인 친구 요청만 수락할 수 있습니다.");
		}

		friendship.accept();
		notificationService.createForMember(
			friendship.getRequester(),
			NotificationType.FRIEND,
			"친구 요청 수락",
			friendship.getReceiver().getNickname() + "님이 친구 요청을 수락했습니다.",
			"FRIENDSHIP",
			friendship.getId()
		);

		return FriendResponse.of(friendship, friendship.getRequester());
	}

	@Transactional
	public void declineRequest(Long memberId, Long requestId) {
		Friendship friendship = getFriendship(requestId);
		if (!friendship.isReceiver(memberId)) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}
		if (friendship.getStatus() != FriendshipStatus.PENDING) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "대기 중인 친구 요청만 거절할 수 있습니다.");
		}

		friendshipRepository.delete(friendship);
	}

	@Transactional
	public void removeFriend(Long memberId, Long friendshipId) {
		Friendship friendship = getFriendship(friendshipId);
		if (!friendship.involves(memberId)) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}
		if (friendship.getStatus() != FriendshipStatus.ACCEPTED) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "친구 관계만 삭제할 수 있습니다.");
		}

		friendshipRepository.delete(friendship);
	}

	private FriendSearchStatus resolveSearchStatus(Long memberId, Friendship friendship) {
		if (friendship == null) {
			return FriendSearchStatus.NONE;
		}
		if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
			return FriendSearchStatus.FRIEND;
		}
		return friendship.isRequester(memberId)
			? FriendSearchStatus.PENDING_OUTGOING
			: FriendSearchStatus.PENDING_INCOMING;
	}

	private Friendship getFriendship(Long friendshipId) {
		return friendshipRepository.findById(friendshipId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND, "친구 관계를 찾을 수 없습니다."));
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
