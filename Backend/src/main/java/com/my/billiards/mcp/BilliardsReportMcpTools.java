package com.my.billiards.mcp;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.GameStatisticsResponse;
import com.my.billiards.game.dto.OpponentStatisticsResponse;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.mcp.dto.McpGameStatisticsResponse;
import com.my.billiards.mcp.dto.McpWeeklyGameReportResponse;
import com.my.billiards.game.service.GameRecordService;
import com.my.billiards.security.AuthenticatedMember;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BilliardsReportMcpTools {

	private static final int DEFAULT_RECENT_GAME_COUNT = 10;
	private static final int MAX_RECENT_GAME_COUNT = 50;

	private final GameRecordService gameRecordService;

	@McpTool(
		name = "get_weekly_game_report",
		description = "Returns the authenticated member's selected billiards game's current and previous weekly report.",
		generateOutputSchema = true,
		annotations = @McpTool.McpAnnotations(
			readOnlyHint = true,
			destructiveHint = false,
			idempotentHint = true,
			openWorldHint = false
		)
	)
	public McpWeeklyGameReportResponse getWeeklyGameReport(
		@McpToolParam(description = "Billiards game type. Use exactly 3-Cushion or 4-Ball.", required = true)
		String gameType
	) {
		WeeklyGameReportResponse response = gameRecordService.getWeeklyReport(
			currentMemberId(),
			toGameType(gameType),
			null
		);
		return McpWeeklyGameReportResponse.from(response);
	}

	@McpTool(
		name = "get_recent_game_statistics",
		description = "Returns aggregate statistics and trend data for the authenticated member's selected billiards game.",
		generateOutputSchema = true,
		annotations = @McpTool.McpAnnotations(
			readOnlyHint = true,
			destructiveHint = false,
			idempotentHint = true,
			openWorldHint = false
		)
	)
	public McpGameStatisticsResponse getRecentGameStatistics(
		@McpToolParam(description = "Billiards game type. Use exactly 3-Cushion or 4-Ball.", required = true)
		String gameType,
		@McpToolParam(description = "Number of recent games to include, from 1 to 50. Defaults to 10.", required = false)
		Integer recentGameCount
	) {
		int requestedGameCount = recentGameCount == null ? DEFAULT_RECENT_GAME_COUNT : recentGameCount;
		validateRecentGameCount(requestedGameCount);

		GameStatisticsResponse response = gameRecordService.getStatistics(
			currentMemberId(),
			toGameType(gameType),
			requestedGameCount
		);
		return McpGameStatisticsResponse.from(response);
	}

	@McpTool(
		name = "get_opponent_statistics",
		description = "Returns the authenticated member's win-loss records and aggregate statistics grouped by opponent.",
		generateOutputSchema = true,
		annotations = @McpTool.McpAnnotations(
			readOnlyHint = true,
			destructiveHint = false,
			idempotentHint = true,
			openWorldHint = false
		)
	)
	public List<OpponentStatisticsResponse> getOpponentStatistics() {
		return gameRecordService.getOpponentStatistics(currentMemberId());
	}

	private Long currentMemberId() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedMember member)) {
			throw new BilliardsException(ErrorCode.UNAUTHORIZED);
		}

		return member.id();
	}

	private GameType toGameType(String gameType) {
		try {
			return GameType.from(gameType);
		} catch (IllegalArgumentException exception) {
			throw new BilliardsException(ErrorCode.INVALID_INPUT_VALUE, "Unsupported game type.");
		}
	}

	private void validateRecentGameCount(int recentGameCount) {
		if (recentGameCount < 1 || recentGameCount > MAX_RECENT_GAME_COUNT) {
			throw new BilliardsException(
				ErrorCode.INVALID_INPUT_VALUE,
				"recentGameCount must be between 1 and " + MAX_RECENT_GAME_COUNT + "."
			);
		}
	}
}
