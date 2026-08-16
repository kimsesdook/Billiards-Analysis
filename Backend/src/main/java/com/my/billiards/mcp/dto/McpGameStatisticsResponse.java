package com.my.billiards.mcp.dto;

import com.my.billiards.game.domain.GameTrend;
import com.my.billiards.game.dto.GameAverageTrendResponse;
import com.my.billiards.game.dto.GameStatisticsResponse;
import java.math.BigDecimal;
import java.util.List;

public record McpGameStatisticsResponse(
	String type,
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

	public static McpGameStatisticsResponse from(GameStatisticsResponse response) {
		return new McpGameStatisticsResponse(
			response.type().getValue(),
			response.totalGames(),
			response.wins(),
			response.losses(),
			response.winRate(),
			response.overallAverage(),
			response.bestAverage(),
			response.maxHighRun(),
			response.totalInnings(),
			response.totalPoints(),
			response.calculatedDama(),
			response.trend(),
			response.changeRate(),
			response.recentAverageTrends()
		);
	}
}
