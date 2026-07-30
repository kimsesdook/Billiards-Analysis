package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameRecord;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record GameAverageTrendResponse(
	Long gameRecordId,
	OffsetDateTime playedAt,
	BigDecimal average,
	int highRun,
	boolean win
) {

	public static GameAverageTrendResponse from(GameRecord record) {
		return new GameAverageTrendResponse(
			record.getId(),
			record.getPlayedAt(),
			record.getAverage(),
			record.getHighRun(),
			record.isWin()
		);
	}
}
