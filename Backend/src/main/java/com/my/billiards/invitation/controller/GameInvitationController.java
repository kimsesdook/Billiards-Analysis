package com.my.billiards.invitation.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.invitation.dto.GameInvitationCreateRequest;
import com.my.billiards.invitation.dto.GameInvitationResponse;
import com.my.billiards.invitation.dto.GameInvitationsResponse;
import com.my.billiards.invitation.service.GameInvitationService;
import com.my.billiards.security.AuthenticatedMember;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/game-invitations")
@Tag(name = "Game Invitations", description = "Authenticated game invitation APIs")
@SecurityRequirement(name = "bearerAuth")
public class GameInvitationController {

	private final GameInvitationService gameInvitationService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse<GameInvitationResponse> create(
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody GameInvitationCreateRequest request
	) {
		return ApiResponse.success(gameInvitationService.create(member.id(), request));
	}

	@GetMapping
	public ApiResponse<GameInvitationsResponse> findPending(@AuthenticationPrincipal AuthenticatedMember member) {
		return ApiResponse.success(gameInvitationService.findPending(member.id()));
	}

	@PatchMapping("/{invitationId}/accept")
	public ApiResponse<GameInvitationResponse> accept(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long invitationId
	) {
		return ApiResponse.success(gameInvitationService.accept(member.id(), invitationId));
	}

	@PatchMapping("/{invitationId}/decline")
	public ApiResponse<GameInvitationResponse> decline(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long invitationId
	) {
		return ApiResponse.success(gameInvitationService.decline(member.id(), invitationId));
	}
}
