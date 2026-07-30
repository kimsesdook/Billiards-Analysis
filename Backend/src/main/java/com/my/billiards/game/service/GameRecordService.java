package com.my.billiards.game.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.common.api.PageResponse;
import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameTrend;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.GameAverageTrendResponse;
import com.my.billiards.game.dto.GameRecordCreateRequest;
import com.my.billiards.game.dto.GameRecordResponse;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.GameRecordUpdateRequest;
import com.my.billiards.game.dto.OpponentStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportComparison;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.game.dto.WeeklyGameSummary;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class GameRecordService {

	private static final int TREND_COMPARISON_GAME_COUNT = 5;
	private static final BigDecimal TREND_CHANGE_THRESHOLD = BigDecimal.valueOf(5);
	private static final int WEEK_LENGTH_DAYS = 7;

	private final GameRecordRepository gameRecordRepository;
	private final MemberRepository memberRepository;

	@Transactional
	public GameRecordResponse create(Long memberId, GameRecordCreateRequest request) {
		Member member = getActiveMember(memberId);
		GameRecord gameRecord = GameRecord.create(
			member,
			request.date(),
			request.type(),
			request.mode(),
			request.myScore(),
			request.opponentScore(),
			request.innings(),
			request.highRun(),
			request.playerCount(),
			request.rank(),
			request.lastThreeCushions(),
			request.notes(),
			request.opponentName(),
			request.inningScores(),
			request.myCushionScore(),
			request.opponentCushionScore()
		);

		return GameRecordResponse.from(gameRecordRepository.save(gameRecord));
	}

	@Transactional(readOnly = true)
	public List<GameRecordResponse> findAll(Long memberId) {
		return gameRecordRepository.findAllByMemberIdOrderByPlayedAtDescIdDesc(memberId)
			.stream()
			.map(GameRecordResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public GameRecordResponse findById(Long memberId, Long id) {
		return GameRecordResponse.from(getGameRecord(memberId, id));
	}

	@Transactional(readOnly = true)
	public List<OpponentStatisticsResponse> getOpponentStatistics(Long memberId) {
		return gameRecordRepository.findOpponentStatisticsByMemberId(memberId)
			.stream()
			.map(OpponentStatisticsResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public PageResponse<GameRecordResponse> search(
		Long memberId,
		GameType type,
		GameMode mode,
		Integer playerCount,
		String keyword,
		int page,
		int size
	) {
		PageRequest pageRequest = PageRequest.of(
			page,
			size,
			Sort.by(Sort.Order.desc("playedAt"), Sort.Order.desc("id"))
		);

		return PageResponse.from(
			gameRecordRepository.searchByConditions(
				memberId,
				type,
				mode,
				playerCount,
				normalizeKeyword(keyword),
				pageRequest
			),
			GameRecordResponse::from
		);
	}

	@Transactional
	public GameRecordResponse update(Long memberId, Long id, GameRecordUpdateRequest request) {
		GameRecord gameRecord = getGameRecord(memberId, id);
		gameRecord.update(
			request.date(),
			request.type(),
			request.mode(),
			request.myScore(),
			request.opponentScore(),
			request.innings(),
			request.highRun(),
			request.playerCount(),
			request.rank(),
			request.lastThreeCushions(),
			request.notes(),
			request.opponentName(),
			request.inningScores(),
			request.myCushionScore(),
			request.opponentCushionScore()
		);

		return GameRecordResponse.from(gameRecord);
	}

	@Transactional(readOnly = true)
	public GameStatisticsResponse getStatistics(Long memberId, GameType type, int recentGameCount) {
		List<GameRecord> records = gameRecordRepository.findAllByMemberIdAndTypeOrderByPlayedAtDescIdDesc(memberId, type);
		int totalGames = records.size();
		int wins = (int) records.stream().filter(GameRecord::isWin).count();
		int totalInnings = records.stream().mapToInt(GameRecord::getInnings).sum();
		int totalPoints = records.stream().mapToInt(GameRecord::getMyScore).sum();
		List<GameRecord> recentRecords = records.stream().limit(recentGameCount).toList();

		return new GameStatisticsResponse(
			type,
			totalGames,
			wins,
			totalGames - wins,
			calculateWinRate(wins, totalGames),
			calculateAverage(totalPoints, totalInnings),
			records.stream()
				.map(GameRecord::getAverage)
				.max(Comparator.naturalOrder())
				.orElse(BigDecimal.ZERO.setScale(3)),
			records.stream().mapToInt(GameRecord::getHighRun).max().orElse(0),
			totalInnings,
			totalPoints,
			calculateDama(type, recentRecords),
			calculateTrend(records),
			calculateChangeRate(records),
			recentRecords.stream()
				.sorted(Comparator.comparing(GameRecord::getPlayedAt).thenComparing(GameRecord::getId))
				.map(GameAverageTrendResponse::from)
				.toList()
		);
	}

	@Transactional(readOnly = true)
	public WeeklyGameReportResponse getWeeklyReport(Long memberId, GameType type, LocalDate referenceDate) {
		LocalDate reportDate = referenceDate == null ? LocalDate.now(ZoneOffset.UTC) : referenceDate;
		LocalDate currentWeekStartDate = reportDate.minusDays(WEEK_LENGTH_DAYS - 1L);
		LocalDate previousWeekStartDate = currentWeekStartDate.minusDays(WEEK_LENGTH_DAYS);
		OffsetDateTime currentWeekStartAt = currentWeekStartDate.atStartOfDay().atOffset(ZoneOffset.UTC);
		OffsetDateTime reportEndAt = reportDate.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

		List<GameRecord> records = gameRecordRepository.findWeeklyReportRecords(
			memberId,
			type,
			previousWeekStartDate.atStartOfDay().atOffset(ZoneOffset.UTC),
			reportEndAt
		);
		List<GameRecord> currentWeekRecords = records.stream()
			.filter(record -> !record.getPlayedAt().isBefore(currentWeekStartAt))
			.toList();
		List<GameRecord> previousWeekRecords = records.stream()
			.filter(record -> record.getPlayedAt().isBefore(currentWeekStartAt))
			.toList();
		WeeklyGameSummary currentWeek = summarizeWeek(currentWeekRecords);
		WeeklyGameSummary previousWeek = summarizeWeek(previousWeekRecords);

		return new WeeklyGameReportResponse(
			type,
			currentWeekStartDate,
			reportDate,
			previousWeekStartDate,
			currentWeekStartDate.minusDays(1),
			currentWeek,
			previousWeek,
			compareWeeks(currentWeek, previousWeek)
		);
	}

	@Transactional
	public void delete(Long memberId, Long id) {
		GameRecord gameRecord = getGameRecord(memberId, id);
		gameRecordRepository.delete(gameRecord);
	}

	private GameRecord getGameRecord(Long memberId, Long id) {
		return gameRecordRepository.findByIdAndMemberId(id, memberId)
			.orElseThrow(() -> new BilliardsException(
				ErrorCode.RESOURCE_NOT_FOUND,
				"경기 기록을 찾을 수 없습니다."
			));
	}

	private String normalizeKeyword(String keyword) {
		if (keyword == null || keyword.isBlank()) {
			return null;
		}

		return keyword.trim();
	}

	private Member getActiveMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.UNAUTHORIZED));

		if (member.getStatus() != MemberStatus.ACTIVE) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return member;
	}

	private int calculateWinRate(int wins, int totalGames) {
		if (totalGames == 0) {
			return 0;
		}

		return BigDecimal.valueOf(wins)
			.divide(BigDecimal.valueOf(totalGames), 2, RoundingMode.HALF_UP)
			.multiply(BigDecimal.valueOf(100))
			.setScale(0, RoundingMode.HALF_UP)
			.intValue();
	}

	private WeeklyGameSummary summarizeWeek(List<GameRecord> records) {
		int totalGames = records.size();
		int wins = (int) records.stream().filter(GameRecord::isWin).count();
		int totalInnings = records.stream().mapToInt(GameRecord::getInnings).sum();
		int totalPoints = records.stream().mapToInt(GameRecord::getMyScore).sum();

		return new WeeklyGameSummary(
			totalGames,
			wins,
			totalGames - wins,
			calculateWinRate(wins, totalGames),
			calculateAverage(totalPoints, totalInnings),
			records.stream().mapToInt(GameRecord::getHighRun).max().orElse(0),
			totalInnings,
			totalPoints
		);
	}

	private WeeklyGameReportComparison compareWeeks(
		WeeklyGameSummary currentWeek,
		WeeklyGameSummary previousWeek
	) {
		boolean hasPreviousWeekData = previousWeek.totalGames() > 0;
		BigDecimal averageChange = currentWeek.overallAverage().subtract(previousWeek.overallAverage())
			.setScale(3, RoundingMode.HALF_UP);
		BigDecimal averageChangeRate = calculateWeekAverageChangeRate(
			currentWeek.overallAverage(),
			previousWeek.overallAverage()
		);

		return new WeeklyGameReportComparison(
			hasPreviousWeekData,
			currentWeek.totalGames() - previousWeek.totalGames(),
			currentWeek.winRate() - previousWeek.winRate(),
			averageChange,
			averageChangeRate,
			currentWeek.maxHighRun() - previousWeek.maxHighRun(),
			calculateWeekTrend(hasPreviousWeekData, averageChangeRate)
		);
	}

	private BigDecimal calculateWeekAverageChangeRate(BigDecimal currentAverage, BigDecimal previousAverage) {
		if (previousAverage.compareTo(BigDecimal.ZERO) == 0) {
			return BigDecimal.ZERO.setScale(1);
		}

		return currentAverage.subtract(previousAverage)
			.divide(previousAverage, 4, RoundingMode.HALF_UP)
			.multiply(BigDecimal.valueOf(100))
			.setScale(1, RoundingMode.HALF_UP);
	}

	private GameTrend calculateWeekTrend(boolean hasPreviousWeekData, BigDecimal averageChangeRate) {
		if (!hasPreviousWeekData) {
			return GameTrend.STABLE;
		}

		if (averageChangeRate.compareTo(TREND_CHANGE_THRESHOLD) > 0) {
			return GameTrend.RISING;
		}
		if (averageChangeRate.compareTo(TREND_CHANGE_THRESHOLD.negate()) < 0) {
			return GameTrend.FALLING;
		}
		return GameTrend.STABLE;
	}

	private BigDecimal calculateAverage(int totalPoints, int totalInnings) {
		if (totalInnings == 0) {
			return BigDecimal.ZERO.setScale(3);
		}

		return BigDecimal.valueOf(totalPoints)
			.divide(BigDecimal.valueOf(totalInnings), 3, RoundingMode.HALF_UP);
	}

	private int calculateDama(GameType type, List<GameRecord> recentRecords) {
		int points = recentRecords.stream().mapToInt(GameRecord::getMyScore).sum();
		int innings = recentRecords.stream().mapToInt(GameRecord::getInnings).sum();
		BigDecimal average = calculateAverage(points, innings);
		int multiplier = type == GameType.THREE_CUSHION ? 100 : 50;

		return average.multiply(BigDecimal.valueOf(multiplier))
			.setScale(0, RoundingMode.HALF_UP)
			.intValue();
	}

	private GameTrend calculateTrend(List<GameRecord> records) {
		BigDecimal changeRate = calculateChangeRate(records);

		if (changeRate.compareTo(TREND_CHANGE_THRESHOLD) > 0) {
			return GameTrend.RISING;
		}
		if (changeRate.compareTo(TREND_CHANGE_THRESHOLD.negate()) < 0) {
			return GameTrend.FALLING;
		}
		return GameTrend.STABLE;
	}

	private BigDecimal calculateChangeRate(List<GameRecord> records) {
		if (records.size() < TREND_COMPARISON_GAME_COUNT * 2) {
			return BigDecimal.ZERO.setScale(1);
		}

		BigDecimal currentAverage = calculateRecordAverage(records.subList(0, TREND_COMPARISON_GAME_COUNT));
		BigDecimal previousAverage = calculateRecordAverage(records.subList(
			TREND_COMPARISON_GAME_COUNT,
			TREND_COMPARISON_GAME_COUNT * 2
		));

		if (previousAverage.compareTo(BigDecimal.ZERO) == 0) {
			return BigDecimal.ZERO.setScale(1);
		}

		return currentAverage.subtract(previousAverage)
			.divide(previousAverage, 4, RoundingMode.HALF_UP)
			.multiply(BigDecimal.valueOf(100))
			.setScale(1, RoundingMode.HALF_UP);
	}

	private BigDecimal calculateRecordAverage(List<GameRecord> records) {
		return records.stream()
			.map(GameRecord::getAverage)
			.reduce(BigDecimal.ZERO, BigDecimal::add)
			.divide(BigDecimal.valueOf(records.size()), 3, RoundingMode.HALF_UP);
	}
}
