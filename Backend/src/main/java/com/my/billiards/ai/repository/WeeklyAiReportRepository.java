package com.my.billiards.ai.repository;

import com.my.billiards.ai.domain.WeeklyAiReport;
import com.my.billiards.game.domain.GameType;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyAiReportRepository extends JpaRepository<WeeklyAiReport, Long> {

	Optional<WeeklyAiReport> findByMemberIdAndGameTypeAndReportEndDate(
		Long memberId,
		GameType gameType,
		LocalDate reportEndDate
	);
}
