package com.my.billiards.contact.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.my.billiards.contact.domain.ContactInquiry;
import com.my.billiards.contact.domain.InquiryStatus;
import java.time.LocalDateTime;

public record ContactInquiryResponse(
	Long id,
	String title,
	String content,
	String answerContent,
	String answeredByNickname,
	LocalDateTime answeredAt,
	String authorNickname,
	@JsonProperty("isPrivate") boolean isPrivate,
	InquiryStatus status,
	LocalDateTime createdAt
) {

	public static ContactInquiryResponse from(ContactInquiry inquiry) {
		return new ContactInquiryResponse(
			inquiry.getId(),
			inquiry.getTitle(),
			inquiry.getContent(),
			inquiry.getAnswerContent(),
			inquiry.getAnsweredBy() == null ? null : inquiry.getAnsweredBy().getDisplayName(),
			inquiry.getAnsweredAt(),
			inquiry.getMember().getDisplayName(),
			inquiry.isPrivateInquiry(),
			inquiry.getStatus(),
			inquiry.getCreatedAt()
		);
	}
}
