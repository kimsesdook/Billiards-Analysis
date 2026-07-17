package com.my.billiards.game.repository;

import com.my.billiards.game.domain.GameRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRecordRepository extends JpaRepository<GameRecord, Long> {

	List<GameRecord> findAllByMemberIdOrderByPlayedAtDescIdDesc(Long memberId);

	Optional<GameRecord> findByIdAndMemberId(Long id, Long memberId);
}
