package com.my.billiards.game.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import com.my.billiards.member.domain.Member;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;

@Getter
@Entity
@Table(name = "game_records")
public class GameRecord extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "member_id")
	private Member member;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "game_room_id")
	private GameRoom gameRoom;

	@Column(name = "played_at", nullable = false)
	private OffsetDateTime playedAt;

	@Enumerated(EnumType.STRING)
	@Column(name = "game_type", nullable = false, length = 30)
	private GameType type;

	@Enumerated(EnumType.STRING)
	@Column(name = "game_mode", nullable = false, length = 30)
	private GameMode mode;

	@Column(name = "my_score", nullable = false)
	private int myScore;

	@Column(name = "opponent_score", nullable = false)
	private int opponentScore;

	@Column(nullable = false)
	private int innings;

	@Column(name = "high_run", nullable = false)
	private int highRun;

	@Column(nullable = false, precision = 10, scale = 3)
	private BigDecimal average;

	@Column(name = "is_win", nullable = false)
	private boolean win;

	@Column(name = "player_count", nullable = false)
	private int playerCount;

	@Column(name = "rank_value")
	private Integer rank;

	@Column(name = "last_three_cushions")
	private Integer lastThreeCushions;

	@Column(length = 1000)
	private String notes;

	@Column(name = "opponent_name", length = 100)
	private String opponentName;

	@ElementCollection
	@CollectionTable(
		name = "game_record_inning_scores",
		joinColumns = @JoinColumn(name = "game_record_id")
	)
	@OrderColumn(name = "score_order")
	@Column(name = "score", nullable = false)
	private List<Integer> inningScores = new ArrayList<>();

	@Column(name = "my_cushion_score")
	private Integer myCushionScore;

	@Column(name = "opponent_cushion_score")
	private Integer opponentCushionScore;

	protected GameRecord() {
	}

	private GameRecord(
		Member member,
		OffsetDateTime playedAt,
		GameType type,
		GameMode mode,
		int myScore,
		int opponentScore,
		int innings,
		int highRun,
		int playerCount,
		Integer rank,
		Integer lastThreeCushions,
		String notes,
		String opponentName,
		List<Integer> inningScores,
		Integer myCushionScore,
		Integer opponentCushionScore
	) {
		this.member = member;
		update(
			playedAt,
			type,
			mode,
			myScore,
			opponentScore,
			innings,
			highRun,
			playerCount,
			rank,
			lastThreeCushions,
			notes,
			opponentName,
			inningScores,
			myCushionScore,
			opponentCushionScore
		);
	}

	public void update(
		OffsetDateTime playedAt,
		GameType type,
		GameMode mode,
		int myScore,
		int opponentScore,
		int innings,
		int highRun,
		int playerCount,
		Integer rank,
		Integer lastThreeCushions,
		String notes,
		String opponentName,
		List<Integer> inningScores,
		Integer myCushionScore,
		Integer opponentCushionScore
	) {
		this.playedAt = playedAt;
		this.type = type;
		this.mode = mode;
		this.myScore = myScore;
		this.opponentScore = opponentScore;
		this.innings = innings;
		this.highRun = highRun;
		this.average = calculateAverage(myScore, innings);
		this.win = myScore > opponentScore;
		this.playerCount = playerCount;
		this.rank = playerCount > 2 ? rank : null;
		this.lastThreeCushions = type == GameType.FOUR_BALL ? lastThreeCushions : null;
		this.notes = notes;
		this.opponentName = opponentName;
		this.inningScores.clear();
		this.inningScores.addAll(inningScores == null ? List.of() : inningScores);
		this.myCushionScore = type == GameType.FOUR_BALL ? myCushionScore : null;
		this.opponentCushionScore = type == GameType.FOUR_BALL ? opponentCushionScore : null;
	}

	public static GameRecord create(
		Member member,
		OffsetDateTime playedAt,
		GameType type,
		GameMode mode,
		int myScore,
		int opponentScore,
		int innings,
		int highRun,
		int playerCount,
		Integer rank,
		Integer lastThreeCushions,
		String notes,
		String opponentName,
		List<Integer> inningScores,
		Integer myCushionScore,
		Integer opponentCushionScore
	) {
		return new GameRecord(
			member,
			playedAt,
			type,
			mode,
			myScore,
			opponentScore,
			innings,
			highRun,
			playerCount,
			rank,
			lastThreeCushions,
			notes,
			opponentName,
			inningScores,
			myCushionScore,
			opponentCushionScore
		);
	}

	public static GameRecord createFromGameRoom(
		GameRoom gameRoom,
		Member member,
		OffsetDateTime playedAt,
		GameType type,
		GameMode mode,
		int myScore,
		int opponentScore,
		int innings,
		int highRun,
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
		GameRecord gameRecord = create(
			member,
			playedAt,
			type,
			mode,
			myScore,
			opponentScore,
			innings,
			highRun,
			playerCount,
			rank,
			lastThreeCushions,
			notes,
			opponentName,
			inningScores,
			myCushionScore,
			opponentCushionScore
		);
		gameRecord.gameRoom = gameRoom;
		gameRecord.win = win;
		return gameRecord;
	}

	private static BigDecimal calculateAverage(int myScore, int innings) {
		return BigDecimal.valueOf(myScore)
			.divide(BigDecimal.valueOf(innings), 3, RoundingMode.HALF_UP);
	}
}
