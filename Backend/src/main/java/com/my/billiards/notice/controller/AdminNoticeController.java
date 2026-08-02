package com.my.billiards.notice.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.notice.dto.NoticeCreateRequest;
import com.my.billiards.notice.dto.NoticeResponse;
import com.my.billiards.notice.dto.NoticeUpdateRequest;
import com.my.billiards.notice.service.NoticeService;
import com.my.billiards.security.AuthenticatedMember;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/notices")
@Tag(name = "Admin Notices", description = "Administrator notice publishing APIs")
@SecurityRequirement(name = "bearerAuth")
public class AdminNoticeController {

	private final NoticeService noticeService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse<NoticeResponse> create(
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody NoticeCreateRequest request
	) {
		return ApiResponse.success(noticeService.create(member.id(), request));
	}

	@PatchMapping("/{noticeId}")
	public ApiResponse<NoticeResponse> update(
		@PathVariable Long noticeId,
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody NoticeUpdateRequest request
	) {
		return ApiResponse.success(noticeService.update(noticeId, member.id(), request));
	}

	@DeleteMapping("/{noticeId}")
	public ApiResponse<Void> delete(
		@PathVariable Long noticeId,
		@AuthenticationPrincipal AuthenticatedMember member
	) {
		noticeService.delete(noticeId, member.id());
		return ApiResponse.ok();
	}
}
