package com.my.billiards.notice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.my.billiards.notice.domain.Notice;
import com.my.billiards.notice.domain.NoticeCategory;
import java.time.LocalDateTime;

public record NoticeResponse(
	Long id,
	String title,
	String content,
	NoticeCategory category,
	@JsonProperty("isImportant") boolean isImportant,
	LocalDateTime publishedAt,
	LocalDateTime updatedAt
) {

	public static NoticeResponse from(Notice notice) {
		return new NoticeResponse(
			notice.getId(),
			notice.getTitle(),
			notice.getContent(),
			notice.getCategory(),
			notice.isImportant(),
			notice.getPublishedAt(),
			notice.getUpdatedAt()
		);
	}
}
