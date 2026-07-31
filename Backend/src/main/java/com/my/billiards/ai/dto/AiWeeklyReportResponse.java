package com.my.billiards.ai.dto;

import com.my.billiards.ai.domain.WeeklyAiReport;
import com.my.billiards.game.domain.GameType;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AiWeeklyReportResponse(
	GameType type,
	LocalDate reportStartDate,
	LocalDate reportEndDate,
	String modelName,
	LocalDateTime generatedAt,
	AiWeeklyAnalysis analysis
) {

	public static AiWeeklyReportResponse from(WeeklyAiReport report, AiWeeklyAnalysis analysis) {
		return new AiWeeklyReportResponse(
			report.getGameType(),
			report.getReportStartDate(),
			report.getReportEndDate(),
			report.getModelName(),
			report.getCreatedAt(),
			analysis
		);
	}
}
