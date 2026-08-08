package com.my.billiards.game.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameRoom;
import com.my.billiards.game.domain.GameRoomStatus;
import com.my.billiards.game.dto.GameRoomCreateRequest;
import com.my.billiards.game.dto.GameRoomReadyRequest;
import com.my.billiards.game.dto.GameRoomResponse;
import com.my.billiards.game.event.GameRoomRealtimeEvent;
import com.my.billiards.game.event.GameRoomRealtimeEventType;
import com.my.billiards.game.repository.GameRoomRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GameRoomService {

    private static final int JOIN_CODE_LENGTH = 8;
    private static final int MAX_JOIN_CODE_GENERATION_ATTEMPTS = 5;

    private final GameRoomRepository gameRoomRepository;
    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public GameRoomResponse create(Long memberId, GameRoomCreateRequest request) {
        validateGameModeAndCapacity(request);
        Member host = getActiveMember(memberId);
        GameRoom gameRoom = GameRoom.create(
            host,
            request.name().strip(),
            generateJoinCode(),
            request.gameType(),
            request.gameMode(),
            request.playerCapacity(),
            request.hostTargetScore()
        );

        return GameRoomResponse.from(gameRoomRepository.save(gameRoom));
    }

    @Transactional(readOnly = true)
    public List<GameRoomResponse> findMyRooms(Long memberId) {
        getActiveMember(memberId);
        return gameRoomRepository.findAllByParticipantMemberId(memberId)
            .stream()
            .map(GameRoomResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public GameRoomResponse findById(Long memberId, Long roomId) {
        return GameRoomResponse.from(getAccessibleRoom(memberId, roomId));
    }

    @Transactional
    public GameRoomResponse cancel(Long memberId, Long roomId) {
        GameRoom gameRoom = getAccessibleRoomForUpdate(memberId, roomId);
        if (!gameRoom.isHost(memberId)) {
            throw new BilliardsException(ErrorCode.FORBIDDEN);
        }
        if (gameRoom.getStatus() != GameRoomStatus.WAITING) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_NOT_WAITING);
        }

        gameRoom.cancel();
        GameRoomResponse response = GameRoomResponse.from(gameRoom);
        publishRealtimeEvent(GameRoomRealtimeEventType.ROOM_CANCELED, response);
        return response;
    }

    @Transactional
    public GameRoomResponse updateReady(Long memberId, Long roomId, GameRoomReadyRequest request) {
        GameRoom gameRoom = getAccessibleRoomForUpdate(memberId, roomId);
        if (!gameRoom.isWaiting()) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_NOT_WAITING);
        }

        gameRoom.updateParticipantReady(memberId, request.ready());
        GameRoomResponse response = GameRoomResponse.from(gameRoom);
        publishRealtimeEvent(GameRoomRealtimeEventType.READY_CHANGED, response);
        return response;
    }

    @Transactional
    public GameRoomResponse start(Long memberId, Long roomId) {
        GameRoom gameRoom = getAccessibleRoomForUpdate(memberId, roomId);
        if (!gameRoom.isHost(memberId)) {
            throw new BilliardsException(ErrorCode.FORBIDDEN);
        }
        if (!gameRoom.isWaiting()) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_NOT_WAITING);
        }
        if (!gameRoom.hasAllParticipants()) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_PARTICIPANTS_INCOMPLETE);
        }
        if (!gameRoom.areAllParticipantsReady()) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_PARTICIPANTS_NOT_READY);
        }

        gameRoom.start();
        GameRoomResponse response = GameRoomResponse.from(gameRoom);
        publishRealtimeEvent(GameRoomRealtimeEventType.GAME_STARTED, response);
        return response;
    }

    private void publishRealtimeEvent(GameRoomRealtimeEventType eventType, GameRoomResponse response) {
        eventPublisher.publishEvent(new GameRoomRealtimeEvent(response.roomId(), eventType, response));
    }

    private GameRoom getAccessibleRoom(Long memberId, Long roomId) {
        Member member = getActiveMember(memberId);
        GameRoom gameRoom = gameRoomRepository.findDetailById(roomId)
            .orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND, "게임방을 찾을 수 없습니다."));

        if (!gameRoom.hasParticipant(member.getId())) {
            throw new BilliardsException(ErrorCode.FORBIDDEN);
        }

        return gameRoom;
    }

    private GameRoom getAccessibleRoomForUpdate(Long memberId, Long roomId) {
        Member member = getActiveMember(memberId);
        GameRoom gameRoom = gameRoomRepository.findByIdForUpdate(roomId)
            .orElseThrow(() -> new BilliardsException(ErrorCode.RESOURCE_NOT_FOUND, "게임방을 찾을 수 없습니다."));

        if (!gameRoom.hasParticipant(member.getId())) {
            throw new BilliardsException(ErrorCode.FORBIDDEN);
        }

        return gameRoom;
    }

    private Member getActiveMember(Long memberId) {
        Member member = memberRepository.findById(memberId)
            .orElseThrow(() -> new BilliardsException(ErrorCode.UNAUTHORIZED));

        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new BilliardsException(ErrorCode.FORBIDDEN);
        }

        return member;
    }

    private void validateGameModeAndCapacity(GameRoomCreateRequest request) {
        if (request.gameMode() == GameMode.TEAM && request.playerCapacity() != 4) {
            throw new BilliardsException(
                ErrorCode.INVALID_INPUT_VALUE,
                "팀 경기는 참가 인원이 4명이어야 합니다."
            );
        }
    }

    private String generateJoinCode() {
        for (int attempt = 0; attempt < MAX_JOIN_CODE_GENERATION_ATTEMPTS; attempt++) {
            String joinCode = UUID.randomUUID().toString()
                .replace("-", "")
                .substring(0, JOIN_CODE_LENGTH)
                .toUpperCase(Locale.ROOT);
            if (!gameRoomRepository.existsByJoinCode(joinCode)) {
                return joinCode;
            }
        }

        throw new BilliardsException(ErrorCode.INTERNAL_SERVER_ERROR, "게임방 코드를 생성할 수 없습니다.");
    }
}
