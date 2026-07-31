package com.my.billiards.mcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameType;
import com.my.billiards.game.dto.WeeklyGameReportResponse;
import com.my.billiards.game.service.GameRecordService;
import com.my.billiards.member.domain.MemberRole;
import com.my.billiards.security.AuthenticatedMember;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class BilliardsReportMcpToolsTest {

	private final GameRecordService gameRecordService = mock(GameRecordService.class);
	private final BilliardsReportMcpTools mcpTools = new BilliardsReportMcpTools(gameRecordService);

	@AfterEach
	void clearSecurityContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void weeklyReportUsesTheAuthenticatedMembersId() {
		AuthenticatedMember member = new AuthenticatedMember(7L, "player@example.com", MemberRole.USER);
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(member, null));
		WeeklyGameReportResponse expected = mock(WeeklyGameReportResponse.class);
		when(gameRecordService.getWeeklyReport(7L, GameType.THREE_CUSHION, null)).thenReturn(expected);

		WeeklyGameReportResponse result = mcpTools.getWeeklyGameReport("3-Cushion");

		assertThat(result).isSameAs(expected);
		verify(gameRecordService).getWeeklyReport(7L, GameType.THREE_CUSHION, null);
	}

	@Test
	void reportToolsRejectRequestsWithoutAnAuthenticatedMember() {
		assertThatThrownBy(() -> mcpTools.getOpponentStatistics())
			.isInstanceOf(BilliardsException.class)
			.extracting(exception -> ((BilliardsException) exception).getErrorCode())
			.isEqualTo(ErrorCode.UNAUTHORIZED);
	}

	@Test
	void recentStatisticsUsesTheDefaultRecentGameCount() {
		AuthenticatedMember member = new AuthenticatedMember(7L, "player@example.com", MemberRole.USER);
		SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(member, null));

		mcpTools.getRecentGameStatistics("4-Ball", null);

		verify(gameRecordService).getStatistics(7L, GameType.FOUR_BALL, 10);
	}
}
