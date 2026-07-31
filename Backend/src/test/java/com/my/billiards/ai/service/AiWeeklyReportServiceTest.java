package com.my.billiards.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.ai.config.AiReportProperties;
import com.my.billiards.ai.domain.WeeklyAiReport;
import com.my.billiards.ai.dto.AiWeeklyAnalysis;
import com.my.billiards.ai.dto.AiWeeklyReportResponse;
import com.my.billiards.ai.repository.WeeklyAiReportRepository;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameTrend;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportComparison;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.game.dto.WeeklyGameSummary;
import com.my.billiards.game.service.GameRecordService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

@ExtendWith(MockitoExtension.class)
class AiWeeklyReportServiceTest {

	private static final Long MEMBER_ID = 7L;

	@Mock
	private WeeklyAiReportRepository weeklyAiReportRepository;

	@Mock
	private GameRecordService gameRecordService;

	@Mock
	private WeeklyAiAnalysisGenerator weeklyAiAnalysisGenerator;

	@Mock
	private ObjectProvider<WeeklyAiAnalysisGenerator> weeklyAiAnalysisGeneratorProvider;

	private AiWeeklyReportService aiWeeklyReportService;
	private final ObjectMapper objectMapper = new ObjectMapper();
	private final AiWeeklyAnalysis analysis = new AiWeeklyAnalysis(
		"This week shows a stable scoring rhythm.",
		List.of("Win rate improved."),
		List.of("Keep the opening inning consistent."),
		List.of("Practice a 20-inning routine.", "Review shot selection after each run."),
		"This suggestion is based on aggregate game statistics."
	);

	@BeforeEach
	void setUp() {
		AiReportProperties properties = new AiReportProperties();
		properties.setModelName("gemini-2.5-flash");
		aiWeeklyReportService = new AiWeeklyReportService(
			weeklyAiReportRepository,
			gameRecordService,
			weeklyAiAnalysisGeneratorProvider,
			properties
		);
	}

	@Test
	void generateTodayReportCreatesAndStoresAnAnalysisWhenNoCachedReportExists() {
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		when(weeklyAiReportRepository.findByMemberIdAndGameTypeAndReportEndDate(
			MEMBER_ID,
			GameType.THREE_CUSHION,
			today
		)).thenReturn(Optional.empty());
		when(gameRecordService.getWeeklyReport(MEMBER_ID, GameType.THREE_CUSHION, today)).thenReturn(weeklyReport(2));
		when(gameRecordService.getStatistics(MEMBER_ID, GameType.THREE_CUSHION, 10)).thenReturn(statistics());
		when(weeklyAiAnalysisGeneratorProvider.getIfAvailable()).thenReturn(weeklyAiAnalysisGenerator);
		when(weeklyAiAnalysisGenerator.generate(any(), any())).thenReturn(analysis);
		when(weeklyAiReportRepository.save(any(WeeklyAiReport.class))).thenAnswer(invocation -> invocation.getArgument(0));

		AiWeeklyReportResponse result = aiWeeklyReportService.generateTodayReport(MEMBER_ID, GameType.THREE_CUSHION);

		assertThat(result.type()).isEqualTo(GameType.THREE_CUSHION);
		assertThat(result.modelName()).isEqualTo("gemini-2.5-flash");
		assertThat(result.analysis()).isEqualTo(analysis);
		verify(weeklyAiAnalysisGenerator).generate(any(), any());
		verify(weeklyAiReportRepository).save(any(WeeklyAiReport.class));
	}

	@Test
	void generateTodayReportReturnsTheCachedReportWithoutCallingTheModelAgain() throws Exception {
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		WeeklyAiReport cachedReport = WeeklyAiReport.create(
			MEMBER_ID,
			GameType.THREE_CUSHION,
			today.minusDays(6),
			today,
			objectMapper.writeValueAsString(analysis),
			"gemini-2.5-flash"
		);
		when(weeklyAiReportRepository.findByMemberIdAndGameTypeAndReportEndDate(
			MEMBER_ID,
			GameType.THREE_CUSHION,
			today
		)).thenReturn(Optional.of(cachedReport));

		AiWeeklyReportResponse result = aiWeeklyReportService.generateTodayReport(MEMBER_ID, GameType.THREE_CUSHION);

		assertThat(result.analysis()).isEqualTo(analysis);
		verify(weeklyAiAnalysisGenerator, never()).generate(any(), any());
		verify(weeklyAiReportRepository, never()).save(any());
	}

	@Test
	void generateTodayReportRejectsRequestsWithoutCurrentWeekGameRecords() {
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		when(weeklyAiReportRepository.findByMemberIdAndGameTypeAndReportEndDate(
			MEMBER_ID,
			GameType.THREE_CUSHION,
			today
		)).thenReturn(Optional.empty());
		when(gameRecordService.getWeeklyReport(MEMBER_ID, GameType.THREE_CUSHION, today)).thenReturn(weeklyReport(0));

		assertThatThrownBy(() -> aiWeeklyReportService.generateTodayReport(MEMBER_ID, GameType.THREE_CUSHION))
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.INVALID_INPUT_VALUE);

		verify(weeklyAiAnalysisGenerator, never()).generate(any(), any());
	}

	@Test
	void generateTodayReportReturnsServiceUnavailableWhenTheAiProviderIsDisabled() {
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		when(weeklyAiReportRepository.findByMemberIdAndGameTypeAndReportEndDate(
			MEMBER_ID,
			GameType.THREE_CUSHION,
			today
		)).thenReturn(Optional.empty());
		when(gameRecordService.getWeeklyReport(MEMBER_ID, GameType.THREE_CUSHION, today)).thenReturn(weeklyReport(2));
		when(gameRecordService.getStatistics(MEMBER_ID, GameType.THREE_CUSHION, 10)).thenReturn(statistics());
		when(weeklyAiAnalysisGeneratorProvider.getIfAvailable()).thenReturn(null);

		assertThatThrownBy(() -> aiWeeklyReportService.generateTodayReport(MEMBER_ID, GameType.THREE_CUSHION))
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.AI_SERVICE_UNAVAILABLE);

		verify(weeklyAiAnalysisGenerator, never()).generate(any(), any());
	}

	private WeeklyGameReportResponse weeklyReport(int currentWeekGameCount) {
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		WeeklyGameSummary currentWeek = new WeeklyGameSummary(
			currentWeekGameCount,
			currentWeekGameCount,
			0,
			100,
			BigDecimal.valueOf(1.2),
			4,
			20,
			24
		);
		WeeklyGameSummary previousWeek = new WeeklyGameSummary(
			1,
			0,
			1,
			0,
			BigDecimal.valueOf(0.8),
			2,
			10,
			8
		);
		return new WeeklyGameReportResponse(
			GameType.THREE_CUSHION,
			today.minusDays(6),
			today,
			today.minusDays(13),
			today.minusDays(7),
			currentWeek,
			previousWeek,
			new WeeklyGameReportComparison(true, 1, 100, BigDecimal.valueOf(0.4), BigDecimal.valueOf(50), 2, GameTrend.RISING)
		);
	}

	private GameStatisticsResponse statistics() {
		return new GameStatisticsResponse(
			GameType.THREE_CUSHION,
			10,
			6,
			4,
			60,
			BigDecimal.valueOf(1.1),
			BigDecimal.valueOf(1.5),
			5,
			100,
			110,
			110,
			GameTrend.RISING,
			BigDecimal.valueOf(10),
			List.of()
		);
	}
}
