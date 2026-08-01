package com.my.billiards.contact.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactInquiryAnswerRequest(
	@NotBlank(message = "Answer content is required.")
	@Size(max = 5000, message = "Answer content must be 5000 characters or fewer.")
	String answerContent
) {
}
