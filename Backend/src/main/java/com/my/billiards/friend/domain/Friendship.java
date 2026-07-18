package com.my.billiards.friend.domain;

import com.my.billiards.common.model.BaseTimeEntity;
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
import lombok.Getter;

@Getter
@Entity
@Table(name = "friendships")
public class Friendship extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "requester_id", nullable = false)
	private Member requester;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "receiver_id", nullable = false)
	private Member receiver;

	@Column(name = "member_low_id", nullable = false)
	private Long memberLowId;

	@Column(name = "member_high_id", nullable = false)
	private Long memberHighId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private FriendshipStatus status;

	protected Friendship() {
	}

	private Friendship(Member requester, Member receiver) {
		this.requester = requester;
		this.receiver = receiver;
		this.memberLowId = Math.min(requester.getId(), receiver.getId());
		this.memberHighId = Math.max(requester.getId(), receiver.getId());
		this.status = FriendshipStatus.PENDING;
	}

	public static Friendship request(Member requester, Member receiver) {
		return new Friendship(requester, receiver);
	}

	public void accept() {
		this.status = FriendshipStatus.ACCEPTED;
	}

	public boolean isRequester(Long memberId) {
		return requester.getId().equals(memberId);
	}

	public boolean isReceiver(Long memberId) {
		return receiver.getId().equals(memberId);
	}

	public boolean involves(Long memberId) {
		return isRequester(memberId) || isReceiver(memberId);
	}

	public Member getOtherMember(Long memberId) {
		return isRequester(memberId) ? receiver : requester;
	}
}
