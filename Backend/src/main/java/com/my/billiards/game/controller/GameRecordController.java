package com.my.billiards.game.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.GameRecordCreateRequest;
import com.my.billiards.game.dto.GameRecordResponse;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.GameRecordUpdateRequest;
import com.my.billiards.game.service.GameRecordService;
import com.my.billiards.security.AuthenticatedMember;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

	private void validateRecentGameCount(int recentGameCount) {
		if (recentGameCount < 1 || recentGameCount > 50) {
			throw new BilliardsException(
				ErrorCode.INVALID_INPUT_VALUE,
				"recentGameCount must be between 1 and 50."
			);
		}
	}
}
