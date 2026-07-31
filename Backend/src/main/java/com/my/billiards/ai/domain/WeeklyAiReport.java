package com.my.billiards.ai.domain;

import com.my.billiards.common.model.BaseTimeEntity;
import com.my.billiards.game.domain.GameType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.Getter;

@Getter
@Entity
@Table(
	name = "weekly_ai_reports",
	uniqueConstraints = @UniqueConstraint(
		name = "uk_weekly_ai_reports_member_type_date",
		columnNames = {"member_id", "game_type", "report_end_date"}
	)
)
public class WeeklyAiReport extends BaseTimeEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "member_id", nullable = false)
	private Long memberId;

	@Enumerated(EnumType.STRING)
	@Column(name = "game_type", nullable = false, length = 30)
	private GameType gameType;

	@Column(name = "report_start_date", nullable = false)
	private LocalDate reportStartDate;

	@Column(name = "report_end_date", nullable = false)
	private LocalDate reportEndDate;

	@Column(name = "analysis_json", nullable = false, columnDefinition = "TEXT")
	private String analysisJson;

	@Column(name = "model_name", nullable = false, length = 100)
	private String modelName;

	protected WeeklyAiReport() {
	}

	private WeeklyAiReport(
		Long memberId,
		GameType gameType,
		LocalDate reportStartDate,
		LocalDate reportEndDate,
		String analysisJson,
		String modelName
	) {
		this.memberId = memberId;
		this.gameType = gameType;
		this.reportStartDate = reportStartDate;
		this.reportEndDate = reportEndDate;
		this.analysisJson = analysisJson;
		this.modelName = modelName;
	}

	public static WeeklyAiReport create(
		Long memberId,
		GameType gameType,
		LocalDate reportStartDate,
		LocalDate reportEndDate,
		String analysisJson,
		String modelName
	) {
		return new WeeklyAiReport(
			memberId,
			gameType,
			reportStartDate,
			reportEndDate,
			analysisJson,
			modelName
		);
	}
}
