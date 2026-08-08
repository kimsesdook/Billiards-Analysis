package com.my.billiards.game.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.domain.GameRoom;
import com.my.billiards.game.domain.GameRoomParticipant;
import com.my.billiards.game.domain.GameRoomStatus;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.GameRoomCreateRequest;
import com.my.billiards.game.dto.GameRoomFinishParticipantRequest;
import com.my.billiards.game.dto.GameRoomFinishRequest;
import com.my.billiards.game.dto.GameRoomFinishResponse;
import com.my.billiards.game.dto.GameRoomLiveScoreRequest;
import com.my.billiards.game.dto.GameRoomLiveStateResponse;
import com.my.billiards.game.dto.GameRoomLiveStateUpdateRequest;
import com.my.billiards.game.dto.GameRoomReadyRequest;
import com.my.billiards.game.dto.GameRoomResponse;
import com.my.billiards.game.event.GameRoomRealtimeEvent;
import com.my.billiards.game.event.GameRoomRealtimeEventType;
import com.my.billiards.game.repository.GameRoomRepository;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
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
    private final GameRecordRepository gameRecordRepository;
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

    @Transactional
    public GameRoomFinishResponse finish(Long memberId, Long roomId, GameRoomFinishRequest request) {
        GameRoom gameRoom = getAccessibleRoomForUpdate(memberId, roomId);
        if (!gameRoom.isHost(memberId)) {
            throw new BilliardsException(ErrorCode.FORBIDDEN);
        }
        if (gameRoom.getStatus() == GameRoomStatus.FINISHED) {
            return findExistingCompletion(gameRoom);
        }
        if (gameRoom.getStatus() != GameRoomStatus.IN_PROGRESS) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_NOT_IN_PROGRESS);
        }
        if (gameRoom.getStateVersion() != request.stateVersion()) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_STATE_VERSION_CONFLICT);
        }

        Map<Long, GameRoomFinishParticipantRequest> completionByMember = validateCompletion(gameRoom, request);
        OffsetDateTime playedAt = OffsetDateTime.now(ZoneOffset.UTC);
        List<GameRecord> gameRecords = gameRoom.getGameMode() == GameMode.TEAM
            ? createTeamRecords(gameRoom, request, completionByMember, playedAt)
            : createIndividualRecords(gameRoom, request, completionByMember, playedAt);

        gameRoom.finish();
        List<GameRecord> savedRecords = gameRecordRepository.saveAll(gameRecords);
        GameRoomResponse roomResponse = GameRoomResponse.from(gameRoom);
        publishRealtimeEvent(GameRoomRealtimeEventType.GAME_FINISHED, roomResponse);
        return GameRoomFinishResponse.from(gameRoom, savedRecords);
    }

    @Transactional(readOnly = true)
    public GameRoomLiveStateResponse findLiveState(Long memberId, Long roomId) {
        return GameRoomLiveStateResponse.from(getAccessibleRoom(memberId, roomId));
    }

    @Transactional
    public GameRoomLiveStateResponse updateLiveState(
        Long memberId,
        Long roomId,
        GameRoomLiveStateUpdateRequest request
    ) {
        GameRoom gameRoom = getAccessibleRoomForUpdate(memberId, roomId);
        if (!gameRoom.isHost(memberId)) {
            throw new BilliardsException(ErrorCode.FORBIDDEN);
        }
        if (gameRoom.getStatus() != GameRoomStatus.IN_PROGRESS) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_NOT_IN_PROGRESS);
        }
        if (gameRoom.getStateVersion() != request.stateVersion()) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_STATE_VERSION_CONFLICT);
        }

        validateLiveState(gameRoom, request);
        request.scores().forEach(score -> gameRoom.updateParticipantScore(
            score.memberId(),
            score.currentScore(),
            score.cushionScore(),
            score.highRun()
        ));
        gameRoom.updateLiveState(request.currentInning(), request.activeMemberId());

        GameRoomLiveStateResponse response = GameRoomLiveStateResponse.from(gameRoom);
        eventPublisher.publishEvent(GameRoomRealtimeEvent.liveStateChanged(response));
        return response;
    }

    private void publishRealtimeEvent(GameRoomRealtimeEventType eventType, GameRoomResponse response) {
        eventPublisher.publishEvent(new GameRoomRealtimeEvent(response.roomId(), eventType, response));
    }

    private void validateLiveState(GameRoom gameRoom, GameRoomLiveStateUpdateRequest request) {
        Set<Long> participantIds = gameRoom.getParticipants().stream()
            .map(participant -> participant.getMember().getId())
            .collect(Collectors.toSet());
        Set<Long> requestedMemberIds = request.scores().stream()
            .map(GameRoomLiveScoreRequest::memberId)
            .collect(Collectors.toSet());

        boolean containsEveryParticipant = participantIds.equals(requestedMemberIds)
            && requestedMemberIds.size() == request.scores().size();
        boolean activeMemberParticipates = participantIds.contains(request.activeMemberId());
        boolean validHighRuns = request.scores().stream()
            .allMatch(score -> score.highRun() <= score.currentScore());

        if (!containsEveryParticipant || !activeMemberParticipates || !validHighRuns) {
            throw new BilliardsException(ErrorCode.GAME_ROOM_LIVE_STATE_INVALID);
        }
    }

    private GameRoomFinishResponse findExistingCompletion(GameRoom gameRoom) {
        List<GameRecord> records = gameRecordRepository.findAllByGameRoomIdOrderByIdAsc(gameRoom.getId());
        if (records.size() != gameRoom.getParticipants().size()) {
            throw new BilliardsException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
        return GameRoomFinishResponse.from(gameRoom, records);
    }

    private Map<Long, GameRoomFinishParticipantRequest> validateCompletion(
        GameRoom gameRoom,
        GameRoomFinishRequest request
    ) {
        Map<Long, GameRoomFinishParticipantRequest> completionByMember = new HashMap<>();
        for (GameRoomFinishParticipantRequest participant : request.participants()) {
            if (completionByMember.put(participant.memberId(), participant) != null) {
                throw invalidCompletion();
            }
        }

        Set<Long> roomMemberIds = gameRoom.getParticipants().stream()
            .map(participant -> participant.getMember().getId())
            .collect(Collectors.toSet());
        if (!roomMemberIds.equals(completionByMember.keySet())) {
            throw invalidCompletion();
        }
        if (gameRoom.getGameType() != GameType.FOUR_BALL && request.lastThreeCushions() != 0) {
            throw invalidCompletion();
        }

        for (GameRoomParticipant participant : gameRoom.getParticipants()) {
            GameRoomFinishParticipantRequest completion = completionByMember.get(participant.getMember().getId());
            int inningScoreTotal = safeSum(completion.inningScores());
            int calculatedHighRun = completion.inningScores().stream().mapToInt(Integer::intValue).max().orElse(0);
            if (inningScoreTotal != participant.getCurrentScore()
                || calculatedHighRun != participant.getHighRun()
                || completion.inningScores().size() > gameRoom.getCurrentInning()) {
                throw invalidCompletion();
            }
        }

        if (gameRoom.getGameMode() == GameMode.INDIVIDUAL) {
            boolean hasTeamAssignment = request.participants().stream()
                .anyMatch(participant -> participant.teamNumber() != null);
            if (hasTeamAssignment) {
                throw invalidCompletion();
            }
        } else {
            long firstTeamSize = request.participants().stream()
                .filter(participant -> Integer.valueOf(1).equals(participant.teamNumber()))
                .count();
            long secondTeamSize = request.participants().stream()
                .filter(participant -> Integer.valueOf(2).equals(participant.teamNumber()))
                .count();
            if (gameRoom.getParticipants().size() != 4 || firstTeamSize != 2 || secondTeamSize != 2) {
                throw invalidCompletion();
            }
        }

        return completionByMember;
    }

    private List<GameRecord> createIndividualRecords(
        GameRoom gameRoom,
        GameRoomFinishRequest request,
        Map<Long, GameRoomFinishParticipantRequest> completionByMember,
        OffsetDateTime playedAt
    ) {
        List<GameRecord> records = new ArrayList<>();
        for (GameRoomParticipant participant : gameRoom.getParticipants()) {
            List<GameRoomParticipant> opponents = gameRoom.getParticipants().stream()
                .filter(other -> !other.getMember().getId().equals(participant.getMember().getId()))
                .toList();
            GameRoomParticipant strongestOpponent = opponents.stream()
                .max(this::comparePerformance)
                .orElseThrow(this::invalidCompletion);
            int rank = 1 + (int) opponents.stream()
                .filter(other -> comparePerformance(other, participant) > 0)
                .count();
            boolean win = opponents.stream().allMatch(other -> comparePerformance(participant, other) > 0);
            String opponentNames = opponents.stream()
                .map(other -> other.getMember().getNickname())
                .collect(Collectors.joining(", "));
            GameRoomFinishParticipantRequest completion = completionByMember.get(participant.getMember().getId());

            records.add(GameRecord.createFromGameRoom(
                gameRoom,
                participant.getMember(),
                playedAt,
                gameRoom.getGameType(),
                gameRoom.getGameMode(),
                participant.getCurrentScore(),
                strongestOpponent.getCurrentScore(),
                gameRoom.getCurrentInning(),
                participant.getHighRun(),
                win,
                gameRoom.getParticipants().size(),
                rank,
                request.lastThreeCushions(),
                "Saved automatically from game room.",
                opponentNames,
                completion.inningScores(),
                participant.getCushionScore(),
                strongestOpponent.getCushionScore()
            ));
        }
        return records;
    }

    private List<GameRecord> createTeamRecords(
        GameRoom gameRoom,
        GameRoomFinishRequest request,
        Map<Long, GameRoomFinishParticipantRequest> completionByMember,
        OffsetDateTime playedAt
    ) {
        Map<Integer, List<GameRoomParticipant>> teams = new HashMap<>();
        teams.put(1, new ArrayList<>());
        teams.put(2, new ArrayList<>());
        for (GameRoomParticipant participant : gameRoom.getParticipants()) {
            Integer teamNumber = completionByMember.get(participant.getMember().getId()).teamNumber();
            teams.get(teamNumber).add(participant);
        }

        TeamResult firstTeam = teamResult(teams.get(1), completionByMember);
        TeamResult secondTeam = teamResult(teams.get(2), completionByMember);
        List<GameRecord> records = new ArrayList<>();
        for (GameRoomParticipant participant : gameRoom.getParticipants()) {
            int teamNumber = completionByMember.get(participant.getMember().getId()).teamNumber();
            TeamResult ownTeam = teamNumber == 1 ? firstTeam : secondTeam;
            TeamResult opponentTeam = teamNumber == 1 ? secondTeam : firstTeam;
            int comparison = comparePerformance(
                ownTeam.score(),
                ownTeam.cushionScore(),
                opponentTeam.score(),
                opponentTeam.cushionScore()
            );

            records.add(GameRecord.createFromGameRoom(
                gameRoom,
                participant.getMember(),
                playedAt,
                gameRoom.getGameType(),
                gameRoom.getGameMode(),
                ownTeam.score(),
                opponentTeam.score(),
                gameRoom.getCurrentInning(),
                ownTeam.highRun(),
                comparison > 0,
                gameRoom.getParticipants().size(),
                comparison >= 0 ? 1 : 2,
                request.lastThreeCushions(),
                "Saved automatically from game room.",
                opponentTeam.memberNames(),
                ownTeam.inningScores(),
                ownTeam.cushionScore(),
                opponentTeam.cushionScore()
            ));
        }
        return records;
    }

    private TeamResult teamResult(
        List<GameRoomParticipant> participants,
        Map<Long, GameRoomFinishParticipantRequest> completionByMember
    ) {
        int score = safeSum(participants.stream().map(GameRoomParticipant::getCurrentScore).toList());
        int cushionScore = safeSum(participants.stream().map(GameRoomParticipant::getCushionScore).toList());
        int maxInningCount = participants.stream()
            .map(participant -> completionByMember.get(participant.getMember().getId()).inningScores().size())
            .max(Integer::compareTo)
            .orElse(0);
        List<Integer> inningScores = new ArrayList<>();
        for (int inningIndex = 0; inningIndex < maxInningCount; inningIndex++) {
            int currentIndex = inningIndex;
            List<Integer> scoresAtInning = participants.stream()
                .map(participant -> completionByMember.get(participant.getMember().getId()).inningScores())
                .map(scores -> currentIndex < scores.size() ? scores.get(currentIndex) : 0)
                .toList();
            inningScores.add(safeSum(scoresAtInning));
        }
        int highRun = inningScores.stream().mapToInt(Integer::intValue).max().orElse(0);
        String memberNames = participants.stream()
            .map(participant -> participant.getMember().getNickname())
            .collect(Collectors.joining(", "));
        return new TeamResult(score, cushionScore, highRun, List.copyOf(inningScores), memberNames);
    }

    private int comparePerformance(GameRoomParticipant first, GameRoomParticipant second) {
        return comparePerformance(
            first.getCurrentScore(),
            first.getCushionScore(),
            second.getCurrentScore(),
            second.getCushionScore()
        );
    }

    private int comparePerformance(int firstScore, int firstCushion, int secondScore, int secondCushion) {
        int scoreComparison = Integer.compare(firstScore, secondScore);
        return scoreComparison != 0 ? scoreComparison : Integer.compare(firstCushion, secondCushion);
    }

    private int safeSum(List<Integer> values) {
        try {
            int total = 0;
            for (Integer value : values) {
                total = Math.addExact(total, value);
            }
            return total;
        } catch (ArithmeticException exception) {
            throw invalidCompletion();
        }
    }

    private BilliardsException invalidCompletion() {
        return new BilliardsException(ErrorCode.GAME_ROOM_COMPLETION_INVALID);
    }

    private record TeamResult(
        int score,
        int cushionScore,
        int highRun,
        List<Integer> inningScores,
        String memberNames
    ) {
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
