package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameTrend;
import java.math.BigDecimal;

public record WeeklyGameReportComparison(
	boolean hasPreviousWeekData,
	int gameCountChange,
	int winRateChange,
	BigDecimal overallAverageChange,
	BigDecimal overallAverageChangeRate,
	int highRunChange,
	GameTrend trend
) {
}
