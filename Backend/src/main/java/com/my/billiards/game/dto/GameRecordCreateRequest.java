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

public record GameRecordCreateRequest(
	@NotNull(message = "경기 일시는 필수입니다.")
	OffsetDateTime date,

	@NotNull(message = "게임 종류는 필수입니다.")
	GameType type,

	@NotNull(message = "경기 모드는 필수입니다.")
	GameMode mode,

	@NotNull(message = "내 점수는 필수입니다.")
	@PositiveOrZero(message = "내 점수는 0 이상이어야 합니다.")
	Integer myScore,

	@NotNull(message = "상대 점수는 필수입니다.")
	@PositiveOrZero(message = "상대 점수는 0 이상이어야 합니다.")
	Integer opponentScore,

	@NotNull(message = "이닝 수는 필수입니다.")
	@Positive(message = "이닝 수는 1 이상이어야 합니다.")
	Integer innings,

	@NotNull(message = "하이런은 필수입니다.")
	@PositiveOrZero(message = "하이런은 0 이상이어야 합니다.")
	Integer highRun,

	@NotNull(message = "인원 수는 필수입니다.")
	@Min(value = 2, message = "인원 수는 최소 2명입니다.")
	@Max(value = 4, message = "인원 수는 최대 4명입니다.")
	Integer playerCount,

	@Min(value = 1, message = "순위는 1 이상이어야 합니다.")
	@Max(value = 4, message = "순위는 4 이하이어야 합니다.")
	Integer rank,

	@Min(value = 0, message = "마지막 3쿠션 개수는 0 이상이어야 합니다.")
	@Max(value = 2, message = "마지막 3쿠션 개수는 2 이하이어야 합니다.")
	Integer lastThreeCushions,

	@Size(max = 1000, message = "메모는 1000자 이하로 입력해 주세요.")
	String notes,

	@Size(max = 100, message = "상대 이름은 100자 이하로 입력해 주세요.")
	String opponentName,

	List<@PositiveOrZero(message = "이닝별 점수는 0 이상이어야 합니다.") Integer> inningScores,

	@PositiveOrZero(message = "내 마무리 3쿠션 점수는 0 이상이어야 합니다.")
	Integer myCushionScore,

	@PositiveOrZero(message = "상대 마무리 3쿠션 점수는 0 이상이어야 합니다.")
	Integer opponentCushionScore
) {
}
