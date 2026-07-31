package com.my.billiards.ai.service;

import com.my.billiards.ai.dto.AiWeeklyAnalysis;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportResponse;

public interface WeeklyAiAnalysisGenerator {

	AiWeeklyAnalysis generate(WeeklyGameReportResponse weeklyReport, GameStatisticsResponse statistics);
}
