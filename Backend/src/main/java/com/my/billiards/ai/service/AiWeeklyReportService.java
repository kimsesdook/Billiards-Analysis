package com.my.billiards.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.ai.config.AiReportProperties;
import com.my.billiards.ai.domain.WeeklyAiReport;
import com.my.billiards.ai.dto.AiWeeklyAnalysis;
import com.my.billiards.ai.dto.AiWeeklyReportResponse;
import com.my.billiards.ai.repository.WeeklyAiReportRepository;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.common.ratelimit.RateLimitService;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.game.service.GameRecordService;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiWeeklyReportService {

	private static final int RECENT_GAME_COUNT = 10;

	private final WeeklyAiReportRepository weeklyAiReportRepository;
	private final GameRecordService gameRecordService;
	private final ObjectProvider<WeeklyAiAnalysisGenerator> weeklyAiAnalysisGeneratorProvider;
	private final AiReportProperties aiReportProperties;
	private final RateLimitService rateLimitService;
	private final ConcurrentMap<String, Object> generationLocks = new ConcurrentHashMap<>();
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Transactional(readOnly = true)
	public AiWeeklyReportResponse findTodayReport(Long memberId, GameType type) {
		LocalDate reportEndDate = LocalDate.now(ZoneOffset.UTC);
		WeeklyAiReport report = weeklyAiReportRepository
			.findByMemberIdAndGameTypeAndReportEndDate(memberId, type, reportEndDate)
			.orElseThrow(() -> new BilliardsException(
				ErrorCode.RESOURCE_NOT_FOUND,
				"No AI report has been generated for today."
			));

		return toResponse(report);
	}

	@Transactional
	public AiWeeklyReportResponse generateTodayReport(Long memberId, GameType type) {
		LocalDate reportEndDate = LocalDate.now(ZoneOffset.UTC);
		String lockKey = memberId + ":" + type.name() + ":" + reportEndDate;
		Object generationLock = generationLocks.computeIfAbsent(lockKey, ignored -> new Object());

		synchronized (generationLock) {
			try {
				return generateTodayReport(memberId, type, reportEndDate);
			} finally {
				generationLocks.remove(lockKey, generationLock);
			}
		}
	}

	private AiWeeklyReportResponse generateTodayReport(Long memberId, GameType type, LocalDate reportEndDate) {
		WeeklyAiReport existingReport = weeklyAiReportRepository
			.findByMemberIdAndGameTypeAndReportEndDate(memberId, type, reportEndDate)
			.orElse(null);

		if (existingReport != null) {
			return toResponse(existingReport);
		}

		WeeklyGameReportResponse weeklyReport = gameRecordService.getWeeklyReport(memberId, type, reportEndDate);
		if (weeklyReport.currentWeek().totalGames() == 0) {
			throw new BilliardsException(
				ErrorCode.INVALID_INPUT_VALUE,
				"At least one game record is required to generate an AI report."
			);
		}

		GameStatisticsResponse statistics = gameRecordService.getStatistics(memberId, type, RECENT_GAME_COUNT);
		WeeklyAiAnalysisGenerator analysisGenerator = getAnalysisGenerator();
		rateLimitService.checkAiGeneration(memberId);
		AiWeeklyAnalysis analysis = analysisGenerator.generate(weeklyReport, statistics);
		validateAnalysis(analysis);

		WeeklyAiReport savedReport = weeklyAiReportRepository.save(WeeklyAiReport.create(
			memberId,
			type,
			weeklyReport.currentWeekStartDate(),
			reportEndDate,
			writeAnalysis(analysis),
			aiReportProperties.getModelName()
		));

		return new AiWeeklyReportResponse(
			type,
			weeklyReport.currentWeekStartDate(),
			reportEndDate,
			aiReportProperties.getModelName(),
			savedReport.getCreatedAt(),
			analysis
		);
	}

	private AiWeeklyReportResponse toResponse(WeeklyAiReport report) {
		return AiWeeklyReportResponse.from(report, readAnalysis(report.getAnalysisJson()));
	}

	private WeeklyAiAnalysisGenerator getAnalysisGenerator() {
		WeeklyAiAnalysisGenerator generator = weeklyAiAnalysisGeneratorProvider.getIfAvailable();
		if (generator == null) {
			throw new BilliardsException(
				ErrorCode.AI_SERVICE_UNAVAILABLE,
				"AI analysis is disabled. Configure GEMINI_API_KEY and AI_CHAT_MODEL to enable it."
			);
		}
		return generator;
	}

	private String writeAnalysis(AiWeeklyAnalysis analysis) {
		try {
			return objectMapper.writeValueAsString(analysis);
		} catch (JsonProcessingException exception) {
			throw new BilliardsException(ErrorCode.INTERNAL_SERVER_ERROR, "AI report could not be stored.");
		}
	}

	private AiWeeklyAnalysis readAnalysis(String analysisJson) {
		try {
			return objectMapper.readValue(analysisJson, AiWeeklyAnalysis.class);
		} catch (JsonProcessingException exception) {
			throw new BilliardsException(ErrorCode.INTERNAL_SERVER_ERROR, "Stored AI report could not be read.");
		}
	}

	private void validateAnalysis(AiWeeklyAnalysis analysis) {
		if (analysis == null
			|| isBlank(analysis.summary())
			|| containsBlank(analysis.strengths())
			|| containsBlank(analysis.focusAreas())
			|| containsBlank(analysis.trainingRecommendations())
			|| isBlank(analysis.dataNotice())) {
			throw new BilliardsException(
				ErrorCode.AI_ANALYSIS_FAILED,
				"AI analysis response was incomplete. Please try again."
			);
		}
	}

	private boolean containsBlank(List<String> values) {
		return values == null || values.isEmpty() || values.stream().anyMatch(this::isBlank);
	}

	private boolean isBlank(String value) {
		return value == null || value.isBlank();
	}
}
