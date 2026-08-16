package com.my.billiards.mcp.dto;

import com.my.billiards.game.dto.WeeklyGameReportComparison;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.game.dto.WeeklyGameSummary;
import java.time.LocalDate;

public record McpWeeklyGameReportResponse(
	String type,
	LocalDate currentWeekStartDate,
	LocalDate currentWeekEndDate,
	LocalDate previousWeekStartDate,
	LocalDate previousWeekEndDate,
	WeeklyGameSummary currentWeek,
	WeeklyGameSummary previousWeek,
	WeeklyGameReportComparison comparison
) {

	public static McpWeeklyGameReportResponse from(WeeklyGameReportResponse response) {
		return new McpWeeklyGameReportResponse(
			response.type().getValue(),
			response.currentWeekStartDate(),
			response.currentWeekEndDate(),
			response.previousWeekStartDate(),
			response.previousWeekEndDate(),
			response.currentWeek(),
			response.previousWeek(),
			response.comparison()
		);
	}
}
