package com.my.billiards.game.dto;

import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;

public record GameRecordUpdateRequest(
	@NotNull(message = "Game date is required.")
	OffsetDateTime date,

	@NotNull(message = "Game type is required.")
	GameType type,

	@NotNull(message = "Game mode is required.")
	GameMode mode,

	@NotNull(message = "My score is required.")
	@PositiveOrZero(message = "My score must be zero or greater.")
	Integer myScore,

	@NotNull(message = "Opponent score is required.")
	@PositiveOrZero(message = "Opponent score must be zero or greater.")
	Integer opponentScore,

	@NotNull(message = "Innings are required.")
	@Positive(message = "Innings must be at least one.")
	Integer innings,

	@NotNull(message = "High run is required.")
	@PositiveOrZero(message = "High run must be zero or greater.")
	Integer highRun,

	@NotNull(message = "Player count is required.")
	@Min(value = 2, message = "Player count must be at least two.")
	@Max(value = 4, message = "Player count must be at most four.")
	Integer playerCount,

	@Min(value = 1, message = "Rank must be at least one.")
	@Max(value = 4, message = "Rank must be at most four.")
	Integer rank,

	@Min(value = 0, message = "Last three cushions must be zero or greater.")
	@Max(value = 2, message = "Last three cushions must be at most two.")
	Integer lastThreeCushions,

	@Size(max = 1000, message = "Notes must be 1000 characters or fewer.")
	String notes,

	@Size(max = 100, message = "Opponent name must be 100 characters or fewer.")
	String opponentName,

	List<@PositiveOrZero(message = "Inning scores must be zero or greater.") Integer> inningScores,

	@PositiveOrZero(message = "My cushion score must be zero or greater.")
	Integer myCushionScore,

	@PositiveOrZero(message = "Opponent cushion score must be zero or greater.")
	Integer opponentCushionScore
) {
}
