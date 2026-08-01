package com.my.billiards.contact.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.common.api.PageResponse;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.contact.domain.InquiryStatus;
import com.my.billiards.contact.dto.ContactInquirySummaryResponse;
import com.my.billiards.contact.service.ContactInquiryService;
import com.my.billiards.security.AuthenticatedMember;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/contact-inquiries")
@Tag(name = "Admin Contact Inquiries", description = "Administrator inquiry management APIs")
@SecurityRequirement(name = "bearerAuth")
public class AdminContactInquiryController {

	private static final int MAX_PAGE_SIZE = 100;

	private final ContactInquiryService contactInquiryService;

	@GetMapping
	public ApiResponse<PageResponse<ContactInquirySummaryResponse>> findAll(
		@AuthenticationPrincipal AuthenticatedMember member,
		@RequestParam(required = false) String status,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size
	) {
		validatePageRequest(page, size);
		return ApiResponse.success(contactInquiryService.findAllForAdmin(
			member.id(),
			toOptionalStatus(status),
			page,
			size
		));
	}

	private InquiryStatus toOptionalStatus(String status) {
		if (status == null || status.isBlank()) {
			return null;
		}

		try {
			return InquiryStatus.valueOf(status.strip().toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException exception) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "Unsupported inquiry status.");
		}
	}

	private void validatePageRequest(int page, int size) {
		if (page < 0) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "page must be zero or greater.");
		}

		if (size < 1 || size > MAX_PAGE_SIZE) {
			throw new BilliardsException(
				ErrorCode.INVALID_INPUT_VALUE,
				"size must be between 1 and " + MAX_PAGE_SIZE + "."
			);
		}
	}
}
