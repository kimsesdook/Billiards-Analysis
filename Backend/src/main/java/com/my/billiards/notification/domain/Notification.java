package com.my.billiards.notification.domain;

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
@Table(name = "notifications")
public class Notification extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "member_id", nullable = false)
	private Member member;

	@Enumerated(EnumType.STRING)
	@Column(name = "notification_type", nullable = false, length = 30)
	private NotificationType type;

	@Column(nullable = false, length = 100)
	private String title;

	@Column(nullable = false, length = 500)
	private String message;

	@Column(name = "is_read", nullable = false)
	private boolean read;

	@Column(name = "related_resource_type", length = 50)
	private String relatedResourceType;

	@Column(name = "related_resource_id")
	private Long relatedResourceId;

	protected Notification() {
	}

	private Notification(
		Member member,
		NotificationType type,
		String title,
		String message,
		String relatedResourceType,
		Long relatedResourceId
	) {
		this.member = member;
		this.type = type;
		this.title = title;
		this.message = message;
		this.read = false;
		this.relatedResourceType = relatedResourceType;
		this.relatedResourceId = relatedResourceId;
	}

	public static Notification create(
		Member member,
		NotificationType type,
		String title,
		String message,
		String relatedResourceType,
		Long relatedResourceId
	) {
		return new Notification(member, type, title, message, relatedResourceType, relatedResourceId);
	}

	public void markAsRead() {
		this.read = true;
	}
}
