package com.my.billiards.friend.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.friend.dto.FriendRequestCreateRequest;
import com.my.billiards.friend.dto.FriendRequestResponse;
import com.my.billiards.friend.dto.FriendRequestsResponse;
import com.my.billiards.friend.dto.FriendResponse;
import com.my.billiards.friend.dto.FriendSearchResponse;
import com.my.billiards.friend.service.FriendService;
import com.my.billiards.security.AuthenticatedMember;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/friends")
public class FriendController {

	private final FriendService friendService;

	@GetMapping
	public ApiResponse<List<FriendResponse>> findFriends(@AuthenticationPrincipal AuthenticatedMember member) {
		return ApiResponse.success(friendService.findFriends(member.id()));
	}

	@GetMapping("/requests")
	public ApiResponse<FriendRequestsResponse> findRequests(@AuthenticationPrincipal AuthenticatedMember member) {
		return ApiResponse.success(friendService.findRequests(member.id()));
	}

	@GetMapping("/search")
	public ApiResponse<List<FriendSearchResponse>> searchMembers(
		@AuthenticationPrincipal AuthenticatedMember member,
		@RequestParam String keyword
	) {
		return ApiResponse.success(friendService.searchMembers(member.id(), keyword));
	}

	@PostMapping("/requests")
	public ApiResponse<FriendRequestResponse> sendRequest(
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody FriendRequestCreateRequest request
	) {
		return ApiResponse.success(friendService.sendRequest(member.id(), request));
	}

	@PatchMapping("/requests/{requestId}/accept")
	public ApiResponse<FriendResponse> acceptRequest(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long requestId
	) {
		return ApiResponse.success(friendService.acceptRequest(member.id(), requestId));
	}

	@PatchMapping("/requests/{requestId}/decline")
	public ApiResponse<Void> declineRequest(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long requestId
	) {
		friendService.declineRequest(member.id(), requestId);
		return ApiResponse.ok();
	}

	@DeleteMapping("/{friendshipId}")
	public ApiResponse<Void> removeFriend(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long friendshipId
	) {
		friendService.removeFriend(member.id(), friendshipId);
		return ApiResponse.ok();
	}
}
