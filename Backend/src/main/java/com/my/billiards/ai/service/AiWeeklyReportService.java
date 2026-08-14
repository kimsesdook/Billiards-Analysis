package com.my.billiards.ai.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.my.billiards.ai.config.AiReportProperties;
import com.my.billiards.ai.domain.WeeklyAiReport;
import com.my.billiards.ai.dto.AiWeeklyAnalysis;
import com.my.billiards.ai.dto.AiWeeklyReportResponse;
import com.my.billiards.ai.lock.AiReportLockLease;
import com.my.billiards.ai.lock.AiReportLockStore;
import com.my.billiards.ai.repository.WeeklyAiReportRepository;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.common.observability.BusinessMetrics;
import com.my.billiards.common.ratelimit.RateLimitService;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.game.service.GameRecordService;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataIntegrityViolationException;
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
	private final BusinessMetrics businessMetrics;
	private final AiReportLockStore aiReportLockStore;
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

	public AiWeeklyReportResponse generateTodayReport(Long memberId, GameType type) {
		LocalDate reportEndDate = LocalDate.now(ZoneOffset.UTC);
		Optional<AiWeeklyReportResponse> cachedReport = findCachedReport(memberId, type, reportEndDate);
		if (cachedReport.isPresent()) {
			return cachedReport.get();
		}

		String lockIdentity = memberId + ":" + type.name() + ":" + reportEndDate;
		Optional<AiReportLockLease> lease = aiReportLockStore.tryAcquire(
			lockIdentity,
			Duration.ofSeconds(aiReportProperties.getLockTtlSeconds())
		);
		if (lease.isEmpty()) {
			return waitForGeneratedReport(memberId, type, reportEndDate);
		}

		try {
			return findCachedReport(memberId, type, reportEndDate)
				.orElseGet(() -> generateTodayReport(memberId, type, reportEndDate));
		} finally {
			aiReportLockStore.release(lease.get());
		}
	}

	private AiWeeklyReportResponse generateTodayReport(Long memberId, GameType type, LocalDate reportEndDate) {
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
		AiWeeklyAnalysis analysis;
		try {
			analysis = analysisGenerator.generate(weeklyReport, statistics);
			validateAnalysis(analysis);
		} catch (RuntimeException exception) {
			businessMetrics.recordAiReport("failed", type);
			throw exception;
		}

		WeeklyAiReport savedReport;
		try {
			savedReport = weeklyAiReportRepository.save(WeeklyAiReport.create(
				memberId,
				type,
				weeklyReport.currentWeekStartDate(),
				reportEndDate,
				writeAnalysis(analysis),
				aiReportProperties.getModelName()
			));
		} catch (DataIntegrityViolationException exception) {
			return findCachedReport(memberId, type, reportEndDate).orElseThrow(() -> exception);
		}
		businessMetrics.recordAiReport("generated", type);

		return new AiWeeklyReportResponse(
			type,
			weeklyReport.currentWeekStartDate(),
			reportEndDate,
			aiReportProperties.getModelName(),
			savedReport.getCreatedAt(),
			analysis
		);
	}

	private Optional<AiWeeklyReportResponse> findCachedReport(
		Long memberId,
		GameType type,
		LocalDate reportEndDate
	) {
		return weeklyAiReportRepository
			.findByMemberIdAndGameTypeAndReportEndDate(memberId, type, reportEndDate)
			.map(report -> {
				businessMetrics.recordAiReport("cache_hit", type);
				return toResponse(report);
			});
	}

	private AiWeeklyReportResponse waitForGeneratedReport(
		Long memberId,
		GameType type,
		LocalDate reportEndDate
	) {
		long waitNanos = Duration.ofSeconds(aiReportProperties.getLockWaitSeconds()).toNanos();
		long deadline = System.nanoTime() + waitNanos;
		while (System.nanoTime() < deadline) {
			long remainingNanos = deadline - System.nanoTime();
			long sleepMillis = Math.min(
				aiReportProperties.getLockPollIntervalMillis(),
				Math.max(1, TimeUnit.NANOSECONDS.toMillis(remainingNanos))
			);
			try {
				Thread.sleep(sleepMillis);
			} catch (InterruptedException exception) {
				Thread.currentThread().interrupt();
				break;
			}

			Optional<AiWeeklyReportResponse> generatedReport = findCachedReport(memberId, type, reportEndDate);
			if (generatedReport.isPresent()) {
				return generatedReport.get();
			}
		}

		throw new BilliardsException(ErrorCode.AI_REPORT_GENERATION_IN_PROGRESS);
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
