package com.my.billiards.contact.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberRole;
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
@Table(name = "contact_inquiries")
public class ContactInquiry extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "member_id", nullable = false)
	private Member member;

	@Column(nullable = false, length = 150)
	private String title;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String content;

	@Column(name = "answer_content", columnDefinition = "TEXT")
	private String answerContent;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "answered_by_member_id")
	private Member answeredBy;

	@Column(name = "answered_at")
	private LocalDateTime answeredAt;

	@Column(name = "is_private", nullable = false)
	private boolean privateInquiry;

	@Enumerated(EnumType.STRING)
	@Column(name = "inquiry_status", nullable = false, length = 30)
	private InquiryStatus status;

	protected ContactInquiry() {
	}

	private ContactInquiry(Member member, String title, String content, boolean privateInquiry) {
		this.member = member;
		this.title = title;
		this.content = content;
		this.privateInquiry = privateInquiry;
		this.status = InquiryStatus.PENDING;
	}

	public static ContactInquiry create(Member member, String title, String content, boolean privateInquiry) {
		return new ContactInquiry(member, title, content, privateInquiry);
	}

	public boolean canBeReadBy(Long viewerId, MemberRole viewerRole) {
		if (!privateInquiry) {
			return true;
		}

		return viewerId != null && (
			member.getId().equals(viewerId) || viewerRole == MemberRole.ADMIN
		);
	}

	public void answer(Member administrator, String answerContent) {
		this.answerContent = answerContent;
		this.answeredBy = administrator;
		this.answeredAt = LocalDateTime.now();
		this.status = InquiryStatus.ANSWERED;
	}
}
