package com.my.billiards.game.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.dto.GameRecordCreateRequest;
import com.my.billiards.game.dto.GameRecordResponse;
import com.my.billiards.game.repository.GameRecordRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GameRecordService {

	private final GameRecordRepository gameRecordRepository;

	@Transactional
	public GameRecordResponse create(GameRecordCreateRequest request) {
		GameRecord gameRecord = GameRecord.create(
			request.date(),
			request.type(),
			request.mode(),
			request.myScore(),
			request.opponentScore(),
			request.innings(),
			request.highRun(),
			request.playerCount(),
			request.rank(),
			request.lastThreeCushions(),
			request.notes(),
			request.opponentName(),
			request.inningScores(),
			request.myCushionScore(),
			request.opponentCushionScore()
		);

		return GameRecordResponse.from(gameRecordRepository.save(gameRecord));
	}

	@Transactional(readOnly = true)
	public List<GameRecordResponse> findAll() {
		return gameRecordRepository.findAllByOrderByPlayedAtDescIdDesc()
			.stream()
			.map(GameRecordResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public GameRecordResponse findById(Long id) {
		return GameRecordResponse.from(getGameRecord(id));
	}

	@Transactional
	public void delete(Long id) {
		GameRecord gameRecord = getGameRecord(id);
		gameRecordRepository.delete(gameRecord);
	}

	private GameRecord getGameRecord(Long id) {
		return gameRecordRepository.findById(id)
			.orElseThrow(() -> new BilliardsException(
				ErrorCode.RESOURCE_NOT_FOUND,
				"경기 기록을 찾을 수 없습니다."
			));
	}
}
