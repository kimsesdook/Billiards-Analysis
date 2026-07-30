package com.my.billiards.game.dto;

import java.math.BigDecimal;

public record WeeklyGameSummary(
	int totalGames,
	int wins,
	int losses,
	int winRate,
	BigDecimal overallAverage,
	int maxHighRun,
	int totalInnings,
	int totalPoints
) {
}
