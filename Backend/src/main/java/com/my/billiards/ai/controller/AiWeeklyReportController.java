package com.my.billiards.ai.controller;

import com.my.billiards.ai.dto.AiWeeklyReportResponse;
import com.my.billiards.ai.service.AiWeeklyReportService;
import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.security.AuthenticatedMember;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-reports")
@RequiredArgsConstructor
public class AiWeeklyReportController {

	private final AiWeeklyReportService aiWeeklyReportService;

	@GetMapping("/weekly")
	public ApiResponse<AiWeeklyReportResponse> findTodayReport(
		@AuthenticationPrincipal AuthenticatedMember member,
		@RequestParam String type
	) {
		return ApiResponse.success(aiWeeklyReportService.findTodayReport(member.id(), toGameType(type)));
	}

	@PostMapping("/weekly")
	public ApiResponse<AiWeeklyReportResponse> generateTodayReport(
		@AuthenticationPrincipal AuthenticatedMember member,
		@RequestParam String type
	) {
		return ApiResponse.success(aiWeeklyReportService.generateTodayReport(member.id(), toGameType(type)));
	}

	private GameType toGameType(String type) {
		try {
			return GameType.from(type);
		} catch (IllegalArgumentException exception) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "Unsupported game type.");
		}
	}
}
