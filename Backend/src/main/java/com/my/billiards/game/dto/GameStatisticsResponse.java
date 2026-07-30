package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.domain.GameTrend;
import java.math.BigDecimal;
import java.util.List;

public record GameStatisticsResponse(
	GameType type,
	int totalGames,
	int wins,
	int losses,
	int winRate,
	BigDecimal overallAverage,
	BigDecimal bestAverage,
	int maxHighRun,
	int totalInnings,
	int totalPoints,
	int calculatedDama,
	GameTrend trend,
	BigDecimal changeRate,
	List<GameAverageTrendResponse> recentAverageTrends
) {
}
