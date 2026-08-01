package com.my.billiards.contact.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ContactInquiryCreateRequest(
	@NotBlank(message = "Title is required.")
	@Size(max = 150, message = "Title must be 150 characters or fewer.")
	String title,

	@NotBlank(message = "Content is required.")
	@Size(max = 5000, message = "Content must be 5000 characters or fewer.")
	String content,

	@NotNull(message = "Privacy selection is required.")
	@JsonProperty("isPrivate") Boolean isPrivate
) {
}
