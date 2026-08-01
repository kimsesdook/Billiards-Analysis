package com.my.billiards.contact.event;

public record ContactInquiryAnsweredEvent(
	Long inquiryId,
	Long memberId
) {
}
