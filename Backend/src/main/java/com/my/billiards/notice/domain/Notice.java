package com.my.billiards.notice.domain;

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
import java.time.LocalDateTime;
import lombok.Getter;

@Getter
@Entity
@Table(name = "notices")
public class Notice extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "author_member_id", nullable = false)
	private Member author;

	@Column(nullable = false, length = 150)
	private String title;

	@Column(nullable = false, columnDefinition = "TEXT")
	private String content;

	@Enumerated(EnumType.STRING)
	@Column(name = "notice_category", nullable = false, length = 30)
	private NoticeCategory category;

	@Column(name = "is_important", nullable = false)
	private boolean important;

	@Column(name = "published_at", nullable = false)
	private LocalDateTime publishedAt;

	@Column(name = "deleted_at")
	private LocalDateTime deletedAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "deleted_by_member_id")
	private Member deletedBy;

	protected Notice() {
	}

	private Notice(Member author, String title, String content, NoticeCategory category, boolean important) {
		this.author = author;
		this.title = title;
		this.content = content;
		this.category = category;
		this.important = important;
		this.publishedAt = LocalDateTime.now();
	}

	public static Notice create(Member author, String title, String content, NoticeCategory category, boolean important) {
		return new Notice(author, title, content, category, important);
	}

	public void update(String title, String content, NoticeCategory category, boolean important) {
		this.title = title;
		this.content = content;
		this.category = category;
		this.important = important;
	}

	public void softDelete(Member administrator) {
		this.deletedAt = LocalDateTime.now();
		this.deletedBy = administrator;
	}
}
