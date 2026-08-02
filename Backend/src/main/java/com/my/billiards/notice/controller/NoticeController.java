package com.my.billiards.notice.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.common.api.PageResponse;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.notice.dto.NoticeResponse;
import com.my.billiards.notice.dto.NoticeSummaryResponse;
import com.my.billiards.notice.service.NoticeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notices")
@Tag(name = "Notices", description = "Public notice listing and detail APIs")
public class NoticeController {

	private static final int MAX_PAGE_SIZE = 100;

	private final NoticeService noticeService;

	@GetMapping
	public ApiResponse<PageResponse<NoticeSummaryResponse>> findAll(
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size
	) {
		validatePageRequest(page, size);
		return ApiResponse.success(noticeService.findAll(page, size));
	}

	@GetMapping("/{noticeId}")
	public ApiResponse<NoticeResponse> findById(@PathVariable Long noticeId) {
		return ApiResponse.success(noticeService.findById(noticeId));
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
