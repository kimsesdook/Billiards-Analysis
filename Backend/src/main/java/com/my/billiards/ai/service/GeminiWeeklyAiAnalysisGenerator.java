package com.my.billiards.ai.service;

import com.my.billiards.ai.dto.AiWeeklyAnalysis;
import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GeminiWeeklyAiAnalysisGenerator implements WeeklyAiAnalysisGenerator {

	private static final String SYSTEM_PROMPT = """
		You are a careful billiards coach. Analyze only the aggregate statistics supplied by the server.
		Never invent facts, never mention people, and never request personal information.
		Respond in Korean. Give concise, encouraging, specific advice.
		""";

	private final ObjectProvider<ChatModel> chatModelProvider;

	@Override
	public AiWeeklyAnalysis generate(WeeklyGameReportResponse weeklyReport, GameStatisticsResponse statistics) {
		ChatModel chatModel = chatModelProvider.getIfAvailable();
		if (chatModel == null) {
			throw new BilliardsException(
				ErrorCode.AI_SERVICE_UNAVAILABLE,
				"AI analysis is disabled. Configure GEMINI_API_KEY and AI_CHAT_MODEL to enable it."
			);
		}

		try {
			return ChatClient.create(chatModel)
				.prompt()
				.system(SYSTEM_PROMPT)
				.user(createUserPrompt(weeklyReport, statistics))
				.call()
				.entity(AiWeeklyAnalysis.class, spec -> spec.useProviderStructuredOutput());
		} catch (BilliardsException exception) {
			throw exception;
		} catch (RuntimeException exception) {
			throw new BilliardsException(
				ErrorCode.AI_ANALYSIS_FAILED,
				"AI analysis could not be generated. Please try again later."
			);
		}
	}

	private String createUserPrompt(WeeklyGameReportResponse weeklyReport, GameStatisticsResponse statistics) {
		return """
			Create a weekly billiards coaching report from the following aggregate statistics.
			Do not mention the model, data transfer, or any individual player.
			Return one summary, one or two strengths, one or two focus areas, two training recommendations,
			and a short data notice explaining that this is a statistics-based suggestion.

			Game type: %s
			Current report period: %s to %s
			Current week games: %d
			Current week wins: %d
			Current week losses: %d
			Current week win rate: %d%%
			Current week average: %s
			Current week best run: %d
			Previous week games: %d
			Previous week win rate: %d%%
			Previous week average: %s
			Weekly average change: %s
			Weekly trend: %s
			All-time games: %d
			All-time win rate: %d%%
			All-time average: %s
			All-time best average: %s
			Recent trend: %s
			Recent average change rate: %s%%
			""".formatted(
			weeklyReport.type().getValue(),
			weeklyReport.currentWeekStartDate(),
			weeklyReport.currentWeekEndDate(),
			weeklyReport.currentWeek().totalGames(),
			weeklyReport.currentWeek().wins(),
			weeklyReport.currentWeek().losses(),
			weeklyReport.currentWeek().winRate(),
			weeklyReport.currentWeek().overallAverage(),
			weeklyReport.currentWeek().maxHighRun(),
			weeklyReport.previousWeek().totalGames(),
			weeklyReport.previousWeek().winRate(),
			weeklyReport.previousWeek().overallAverage(),
			weeklyReport.comparison().overallAverageChange(),
			weeklyReport.comparison().trend(),
			statistics.totalGames(),
			statistics.winRate(),
			statistics.overallAverage(),
			statistics.bestAverage(),
			statistics.trend(),
			statistics.changeRate()
		);
	}
}
