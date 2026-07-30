package com.my.billiards.game.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.common.api.PageResponse;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.dto.GameRecordCreateRequest;
import com.my.billiards.game.dto.GameRecordResponse;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.GameRecordUpdateRequest;
import com.my.billiards.game.dto.OpponentStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.game.service.GameRecordService;
import com.my.billiards.security.AuthenticatedMember;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/game-records")
@RequiredArgsConstructor
public class GameRecordController {

	private static final int MAX_PAGE_SIZE = 100;

	private final GameRecordService gameRecordService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse<GameRecordResponse> create(
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody GameRecordCreateRequest request
	) {
		return ApiResponse.success(gameRecordService.create(member.id(), request));
	}

	@GetMapping
	public ApiResponse<List<GameRecordResponse>> findAll(@AuthenticationPrincipal AuthenticatedMember member) {
		return ApiResponse.success(gameRecordService.findAll(member.id()));
	}

	@GetMapping("/opponent-statistics")
	public ApiResponse<List<OpponentStatisticsResponse>> getOpponentStatistics(
		@AuthenticationPrincipal AuthenticatedMember member
	) {
		return ApiResponse.success(gameRecordService.getOpponentStatistics(member.id()));
	}

	@GetMapping("/search")
	public ApiResponse<PageResponse<GameRecordResponse>> search(
		@AuthenticationPrincipal AuthenticatedMember member,
		@RequestParam(required = false) String type,
		@RequestParam(required = false) String mode,
		@RequestParam(required = false) Integer playerCount,
		@RequestParam(required = false) String keyword,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "20") int size
	) {
		validatePageRequest(page, size);
		validatePlayerCount(playerCount);

		return ApiResponse.success(gameRecordService.search(
			member.id(),
			toOptionalGameType(type),
			toOptionalGameMode(mode),
			playerCount,
			keyword,
			page,
			size
		));
	}

	@GetMapping("/statistics")
	public ApiResponse<GameStatisticsResponse> getStatistics(
		@AuthenticationPrincipal AuthenticatedMember member,
		@RequestParam(required = false) String type,
		@RequestParam(defaultValue = "10") int recentGameCount
	) {
		validateRecentGameCount(recentGameCount);

		return ApiResponse.success(gameRecordService.getStatistics(
			member.id(),
			toGameType(type),
			recentGameCount
		));
	}

	@GetMapping("/weekly-report")
	public ApiResponse<WeeklyGameReportResponse> getWeeklyReport(
		@AuthenticationPrincipal AuthenticatedMember member,
		@RequestParam(required = false) String type,
		@RequestParam(required = false)
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate referenceDate
	) {
		return ApiResponse.success(gameRecordService.getWeeklyReport(
			member.id(),
			toOptionalGameType(type),
			referenceDate
		));
	}

	@GetMapping("/{id}")
	public ApiResponse<GameRecordResponse> findById(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long id
	) {
		return ApiResponse.success(gameRecordService.findById(member.id(), id));
	}

	@PatchMapping("/{id}")
	public ApiResponse<GameRecordResponse> update(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long id,
		@Valid @RequestBody GameRecordUpdateRequest request
	) {
		return ApiResponse.success(gameRecordService.update(member.id(), id, request));
	}

	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long id
	) {
		gameRecordService.delete(member.id(), id);
		return ApiResponse.ok();
	}

	private GameType toGameType(String type) {
		try {
			return GameType.from(type);
		} catch (IllegalArgumentException exception) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "Unsupported game type.");
		}
	}

	private GameType toOptionalGameType(String type) {
		if (type == null || type.isBlank()) {
			return null;
		}

		return toGameType(type);
	}

	private GameMode toOptionalGameMode(String mode) {
		if (mode == null || mode.isBlank()) {
			return null;
		}

		try {
			return GameMode.from(mode);
		} catch (IllegalArgumentException exception) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "Unsupported game mode.");
		}
	}

	private void validateRecentGameCount(int recentGameCount) {
		if (recentGameCount < 1 || recentGameCount > 50) {
			throw new BilliardsException(
				ErrorCode.INVALID_INPUT_VALUE,
				"recentGameCount must be between 1 and 50."
			);
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

	private void validatePlayerCount(Integer playerCount) {
		if (playerCount != null && (playerCount < 2 || playerCount > 4)) {
			throw new BilliardsException(
				ErrorCode.INVALID_INPUT_VALUE,
				"playerCount must be between 2 and 4."
			);
		}
	}
}
