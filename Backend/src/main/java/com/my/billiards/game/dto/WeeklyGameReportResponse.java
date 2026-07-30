package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameType;
import java.time.LocalDate;

public record WeeklyGameReportResponse(
	GameType type,
	LocalDate currentWeekStartDate,
	LocalDate currentWeekEndDate,
	LocalDate previousWeekStartDate,
	LocalDate previousWeekEndDate,
	WeeklyGameSummary currentWeek,
	WeeklyGameSummary previousWeek,
	WeeklyGameReportComparison comparison
) {
}
