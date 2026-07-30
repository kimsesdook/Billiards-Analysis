package com.my.billiards.game.repository;

import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.domain.GameMode;
import com.my.billiards.game.domain.GameType;
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
		  and (:mode is null or gameRecord.mode = :mode)
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
		@Param("keyword") String keyword,
		Pageable pageable
	);
}
