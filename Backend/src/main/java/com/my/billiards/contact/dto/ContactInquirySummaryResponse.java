package com.my.billiards.contact.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.my.billiards.contact.domain.ContactInquiry;
import com.my.billiards.contact.domain.InquiryStatus;
import java.time.LocalDateTime;

public record ContactInquirySummaryResponse(
	Long id,
	String title,
	String authorNickname,
	@JsonProperty("isPrivate") boolean isPrivate,
	InquiryStatus status,
	LocalDateTime createdAt
) {

	public static ContactInquirySummaryResponse from(ContactInquiry inquiry) {
		return new ContactInquirySummaryResponse(
			inquiry.getId(),
			inquiry.getTitle(),
			inquiry.getMember().getDisplayName(),
			inquiry.isPrivateInquiry(),
			inquiry.getStatus(),
			inquiry.getCreatedAt()
		);
	}
}
