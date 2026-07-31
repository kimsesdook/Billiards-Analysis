package com.my.billiards.ai.dto;

import java.util.List;

public record AiWeeklyAnalysis(
	String summary,
	List<String> strengths,
	List<String> focusAreas,
	List<String> trainingRecommendations,
	String dataNotice
) {
}
