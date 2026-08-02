package com.my.billiards.notice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.my.billiards.notice.domain.NoticeCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NoticeCreateRequest(
	@NotBlank(message = "Title is required.")
	@Size(max = 150, message = "Title must be 150 characters or fewer.")
	String title,

	@NotBlank(message = "Content is required.")
	@Size(max = 5000, message = "Content must be 5000 characters or fewer.")
	String content,

	@NotNull(message = "Category is required.")
	NoticeCategory category,

	@NotNull(message = "Important selection is required.")
	@JsonProperty("isImportant") Boolean isImportant
) {
}
