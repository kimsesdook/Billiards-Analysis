package com.my.billiards.member.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.member.dto.MemberProfileResponse;
import com.my.billiards.member.dto.MemberProfileUpdateRequest;
import com.my.billiards.member.dto.PasswordChangeRequest;
import com.my.billiards.member.service.MemberService;
import com.my.billiards.security.AuthenticatedMember;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/members")
@Tag(name = "Members", description = "Authenticated member profile and password APIs")
@SecurityRequirement(name = "bearerAuth")
public class MemberController {

	private final MemberService memberService;

	@GetMapping("/me")
	public ApiResponse<MemberProfileResponse> getMyProfile(@AuthenticationPrincipal AuthenticatedMember member) {
		return ApiResponse.success(memberService.getProfile(member.id()));
	}

	@PatchMapping("/me/profile")
	public ApiResponse<MemberProfileResponse> updateMyProfile(
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody MemberProfileUpdateRequest request
	) {
		return ApiResponse.success(memberService.updateProfile(member.id(), request));
	}

	@PatchMapping("/me/password")
	public ApiResponse<Void> changeMyPassword(
		@AuthenticationPrincipal AuthenticatedMember member,
		@Valid @RequestBody PasswordChangeRequest request
	) {
		memberService.changePassword(member.id(), request);
		return ApiResponse.message("비밀번호가 변경되었습니다.");
	}
}
