package com.my.billiards.contact.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.contact.dto.ContactInquiryCreateRequest;
import com.my.billiards.contact.dto.ContactInquiryResponse;
import com.my.billiards.contact.dto.ContactInquirySummaryResponse;
import com.my.billiards.contact.service.ContactInquiryService;
import com.my.billiards.security.AuthenticatedMember;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/contact-inquiries")
@Tag(name = "Contact Inquiries", description = "Public and private customer inquiry APIs")
public class ContactInquiryController {

	private final ContactInquiryService contactInquiryService;

	@GetMapping
	public ApiResponse<List<ContactInquirySummaryResponse>> findPublic() {
		return ApiResponse.success(contactInquiryService.findPublic());
	}

	@GetMapping("/me")
	@SecurityRequirement(name = "bearerAuth")
	public ApiResponse<List<ContactInquirySummaryResponse>> findMine(
		@AuthenticationPrincipal AuthenticatedMember member
	) {
		return ApiResponse.success(contactInquiryService.findMine(member.id()));
	}

	@GetMapping("/{inquiryId}")
	public ApiResponse<ContactInquiryResponse> findById(
		@PathVariable Long inquiryId,
		@AuthenticationPrincipal AuthenticatedMember member
	) {
		Long viewerId = member == null ? null : member.id();
		return ApiResponse.success(contactInquiryService.findById(
			inquiryId,
			viewerId,
			member == null ? null : member.role()
		));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@SecurityRequirement(name = "bearerAuth")
	public ApiResponse<ContactInquiryResponse> create(
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody ContactInquiryCreateRequest request
	) {
		return ApiResponse.success(contactInquiryService.create(member.id(), request));
	}
}
