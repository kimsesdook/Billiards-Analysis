package com.my.billiards.notice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.my.billiards.notice.domain.Notice;
import com.my.billiards.notice.domain.NoticeCategory;
import java.time.LocalDateTime;

public record NoticeSummaryResponse(
	Long id,
	String title,
	NoticeCategory category,
	@JsonProperty("isImportant") boolean isImportant,
	LocalDateTime publishedAt
) {

	public static NoticeSummaryResponse from(Notice notice) {
		return new NoticeSummaryResponse(
			notice.getId(),
			notice.getTitle(),
			notice.getCategory(),
			notice.isImportant(),
			notice.getPublishedAt()
		);
	}
}
