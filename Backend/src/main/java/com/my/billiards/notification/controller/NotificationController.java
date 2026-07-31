package com.my.billiards.notification.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.notification.dto.NotificationResponse;
import com.my.billiards.notification.service.NotificationService;
import com.my.billiards.security.AuthenticatedMember;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Authenticated notification management APIs")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

	private final NotificationService notificationService;

	@GetMapping
	public ApiResponse<List<NotificationResponse>> findAll(@AuthenticationPrincipal AuthenticatedMember member) {
		return ApiResponse.success(notificationService.findAll(member.id()));
	}

	@GetMapping("/unread-count")
	public ApiResponse<Long> countUnread(@AuthenticationPrincipal AuthenticatedMember member) {
		return ApiResponse.success(notificationService.countUnread(member.id()));
	}

	@PatchMapping("/{notificationId}/read")
	public ApiResponse<NotificationResponse> markAsRead(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long notificationId
	) {
		return ApiResponse.success(notificationService.markAsRead(member.id(), notificationId));
	}

	@PatchMapping("/read-all")
	public ApiResponse<Void> markAllAsRead(@AuthenticationPrincipal AuthenticatedMember member) {
		notificationService.markAllAsRead(member.id());
		return ApiResponse.ok();
	}

	@DeleteMapping("/{notificationId}")
	public ApiResponse<Void> delete(
		@AuthenticationPrincipal AuthenticatedMember member,
		@PathVariable Long notificationId
	) {
		notificationService.delete(member.id(), notificationId);
		return ApiResponse.ok();
	}

	@DeleteMapping
	public ApiResponse<Void> deleteAll(@AuthenticationPrincipal AuthenticatedMember member) {
		notificationService.deleteAll(member.id());
		return ApiResponse.ok();
	}
}
