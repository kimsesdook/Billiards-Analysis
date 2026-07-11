package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.domain.GameType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record GameRecordResponse(
	Long id,
	OffsetDateTime date,
	GameType type,
	GameMode mode,
	int myScore,
	int opponentScore,
	int innings,
	int highRun,
	BigDecimal average,
	boolean win,
	int playerCount,
	Integer rank,
	Integer lastThreeCushions,
	String notes,
	String opponentName,
	List<Integer> inningScores,
	Integer myCushionScore,
	Integer opponentCushionScore
) {

	public static GameRecordResponse from(GameRecord record) {
		return new GameRecordResponse(
			record.getId(),
			record.getPlayedAt(),
			record.getType(),
			record.getMode(),
			record.getMyScore(),
			record.getOpponentScore(),
			record.getInnings(),
			record.getHighRun(),
			record.getAverage(),
			record.isWin(),
			record.getPlayerCount(),
			record.getRank(),
			record.getLastThreeCushions(),
			record.getNotes(),
			record.getOpponentName(),
			List.copyOf(record.getInningScores()),
			record.getMyCushionScore(),
			record.getOpponentCushionScore()
		);
	}
}
