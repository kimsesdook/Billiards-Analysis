package com.my.billiards.game.repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record OpponentStatisticsProjection(
	String opponentName,
	Long totalGames,
	Long wins,
	Long totalMyScore,
	Long totalOpponentScore,
	Long totalInnings,
	BigDecimal bestAverage,
	Integer maxHighRun,
	OffsetDateTime lastPlayedAt
) {
}
