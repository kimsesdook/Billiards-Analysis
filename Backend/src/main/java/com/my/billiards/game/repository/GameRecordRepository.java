package com.my.billiards.game.repository;

import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRecordRepository extends JpaRepository<GameRecord, Long> {

	List<GameRecord> findAllByMemberIdOrderByPlayedAtDescIdDesc(Long memberId);

	List<GameRecord> findAllByMemberIdAndTypeOrderByPlayedAtDescIdDesc(Long memberId, GameType type);

	Optional<GameRecord> findByIdAndMemberId(Long id, Long memberId);

	@Query("""
		select gameRecord
		from GameRecord gameRecord
		where gameRecord.member.id = :memberId
		  and (:type is null or gameRecord.type = :type)
		  and gameRecord.playedAt >= :startAt
		  and gameRecord.playedAt < :endAt
		order by gameRecord.playedAt desc, gameRecord.id desc
		""")
	List<GameRecord> findWeeklyReportRecords(
		@Param("memberId") Long memberId,
		@Param("type") GameType type,
		@Param("startAt") OffsetDateTime startAt,
		@Param("endAt") OffsetDateTime endAt
	);

	@Query("""
		select new com.my.billiards.game.repository.OpponentStatisticsProjection(
			coalesce(nullif(trim(gameRecord.opponentName), ''), 'Anonymous'),
			count(gameRecord),
			sum(case when gameRecord.win = true then 1 else 0 end),
			sum(gameRecord.myScore),
			sum(gameRecord.opponentScore),
			sum(gameRecord.innings),
			max(gameRecord.average),
			max(gameRecord.highRun),
			max(gameRecord.playedAt)
		)
		from GameRecord gameRecord
		where gameRecord.member.id = :memberId
		group by coalesce(nullif(trim(gameRecord.opponentName), ''), 'Anonymous')
		order by count(gameRecord) desc, max(gameRecord.playedAt) desc
		""")
	List<OpponentStatisticsProjection> findOpponentStatisticsByMemberId(@Param("memberId") Long memberId);

	@Query("""
		select gameRecord
		from GameRecord gameRecord
		where gameRecord.member.id = :memberId
		  and (:type is null or gameRecord.type = :type)
		  and (:mode is null or gameRecord.mode = :mode)
		  and (:playerCount is null or gameRecord.playerCount = :playerCount)
		  and (
			:keyword is null
			or lower(coalesce(gameRecord.opponentName, '')) like lower(concat('%', :keyword, '%'))
			or lower(coalesce(gameRecord.notes, '')) like lower(concat('%', :keyword, '%'))
		  )
		""")
	Page<GameRecord> searchByConditions(
		@Param("memberId") Long memberId,
		@Param("type") GameType type,
		@Param("mode") GameMode mode,
		@Param("playerCount") Integer playerCount,
		@Param("keyword") String keyword,
		Pageable pageable
	);
}
