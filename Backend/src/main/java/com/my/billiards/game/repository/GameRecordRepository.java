package com.my.billiards.game.repository;

import com.my.billiards.game.domain.GameRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRecordRepository extends JpaRepository<GameRecord, Long> {

	List<GameRecord> findAllByOrderByPlayedAtDescIdDesc();
}
