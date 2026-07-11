package com.my.billiards.game.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.game.dto.GameRecordCreateRequest;
import com.my.billiards.game.dto.GameRecordResponse;
import com.my.billiards.game.service.GameRecordService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/game-records")
@RequiredArgsConstructor
public class GameRecordController {

	private final GameRecordService gameRecordService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse<GameRecordResponse> create(@Valid @RequestBody GameRecordCreateRequest request) {
		return ApiResponse.success(gameRecordService.create(request));
	}

	@GetMapping
	public ApiResponse<List<GameRecordResponse>> findAll() {
		return ApiResponse.success(gameRecordService.findAll());
	}

	@GetMapping("/{id}")
	public ApiResponse<GameRecordResponse> findById(@PathVariable Long id) {
		return ApiResponse.success(gameRecordService.findById(id));
	}

	@DeleteMapping("/{id}")
	public ApiResponse<Void> delete(@PathVariable Long id) {
		gameRecordService.delete(id);
		return ApiResponse.ok();
	}
}
