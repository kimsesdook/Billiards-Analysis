package com.my.billiards.game.controller;

import com.my.billiards.common.api.ApiResponse;
import com.my.billiards.game.dto.GameRoomCreateRequest;
import com.my.billiards.game.dto.GameRoomResponse;
import com.my.billiards.game.service.GameRoomService;
import com.my.billiards.security.AuthenticatedMember;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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
@RequestMapping("/api/game-rooms")
@Tag(name = "Game Rooms", description = "Authenticated game room APIs")
@SecurityRequirement(name = "bearerAuth")
public class GameRoomController {

    private final GameRoomService gameRoomService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<GameRoomResponse> create(
        @AuthenticationPrincipal AuthenticatedMember member,
        @Valid @RequestBody GameRoomCreateRequest request
    ) {
        return ApiResponse.success(gameRoomService.create(member.id(), request));
    }

    @GetMapping
    public ApiResponse<List<GameRoomResponse>> findMyRooms(@AuthenticationPrincipal AuthenticatedMember member) {
        return ApiResponse.success(gameRoomService.findMyRooms(member.id()));
    }

    @GetMapping("/{roomId}")
    public ApiResponse<GameRoomResponse> findById(
        @AuthenticationPrincipal AuthenticatedMember member,
        @PathVariable Long roomId
    ) {
        return ApiResponse.success(gameRoomService.findById(member.id(), roomId));
    }

    @PatchMapping("/{roomId}/cancel")
    public ApiResponse<GameRoomResponse> cancel(
        @AuthenticationPrincipal AuthenticatedMember member,
        @PathVariable Long roomId
    ) {
        return ApiResponse.success(gameRoomService.cancel(member.id(), roomId));
    }
}
