package com.my.billiards.game.dto;

import com.my.billiards.game.repository.OpponentStatisticsProjection;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

public record OpponentStatisticsResponse(
	String opponentName,
	long totalGames,
	long wins,
	long losses,
	int winRate,
	BigDecimal overallAverage,
	BigDecimal bestAverage,
	int maxHighRun,
	long totalInnings,
	long totalMyScore,
	long totalOpponentScore,
	OffsetDateTime lastPlayedAt
) {

	public static OpponentStatisticsResponse from(OpponentStatisticsProjection projection) {
		long totalGames = projection.totalGames();
		long wins = projection.wins();
		long totalInnings = projection.totalInnings();
		long totalMyScore = projection.totalMyScore();

		return new OpponentStatisticsResponse(
			projection.opponentName(),
			totalGames,
			wins,
			totalGames - wins,
			calculateWinRate(wins, totalGames),
			calculateAverage(totalMyScore, totalInnings),
			projection.bestAverage(),
			projection.maxHighRun(),
			totalInnings,
			totalMyScore,
			projection.totalOpponentScore(),
			projection.lastPlayedAt()
		);
	}

	private static int calculateWinRate(long wins, long totalGames) {
		if (totalGames == 0) {
			return 0;
		}

		return BigDecimal.valueOf(wins)
			.divide(BigDecimal.valueOf(totalGames), 2, RoundingMode.HALF_UP)
			.multiply(BigDecimal.valueOf(100))
			.setScale(0, RoundingMode.HALF_UP)
			.intValue();
	}

	private static BigDecimal calculateAverage(long totalMyScore, long totalInnings) {
		if (totalInnings == 0) {
			return BigDecimal.ZERO.setScale(3);
		}

		return BigDecimal.valueOf(totalMyScore)
			.divide(BigDecimal.valueOf(totalInnings), 3, RoundingMode.HALF_UP);
	}
}
