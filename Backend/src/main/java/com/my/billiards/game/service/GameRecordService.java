package com.my.billiards.game.service;

import com.my.billiards.common.error.BilliardsException;
import com.my.billiards.common.error.ErrorCode;
import com.my.billiards.game.domain.GameRecord;
import com.my.billiards.game.dto.GameRecordCreateRequest;
import com.my.billiards.game.dto.GameRecordResponse;
import com.my.billiards.game.repository.GameRecordRepository;
import com.my.billiards.member.domain.Member;
import com.my.billiards.member.domain.MemberStatus;
import com.my.billiards.member.repository.MemberRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GameRecordService {

	private final GameRecordRepository gameRecordRepository;
	private final MemberRepository memberRepository;

	@Transactional
	public GameRecordResponse create(Long memberId, GameRecordCreateRequest request) {
		Member member = getActiveMember(memberId);
		GameRecord gameRecord = GameRecord.create(
			member,
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
	public List<GameRecordResponse> findAll(Long memberId) {
		return gameRecordRepository.findAllByMemberIdOrderByPlayedAtDescIdDesc(memberId)
			.stream()
			.map(GameRecordResponse::from)
			.toList();
	}

	@Transactional(readOnly = true)
	public GameRecordResponse findById(Long memberId, Long id) {
		return GameRecordResponse.from(getGameRecord(memberId, id));
	}

	@Transactional
	public void delete(Long memberId, Long id) {
		GameRecord gameRecord = getGameRecord(memberId, id);
		gameRecordRepository.delete(gameRecord);
	}

	private GameRecord getGameRecord(Long memberId, Long id) {
		return gameRecordRepository.findByIdAndMemberId(id, memberId)
			.orElseThrow(() -> new BilliardsException(
				ErrorCode.RESOURCE_NOT_FOUND,
				"경기 기록을 찾을 수 없습니다."
			));
	}

	private Member getActiveMember(Long memberId) {
		Member member = memberRepository.findById(memberId)
			.orElseThrow(() -> new BilliardsException(ErrorCode.UNAUTHORIZED));

		if (member.getStatus() != MemberStatus.ACTIVE) {
			throw new BilliardsException(ErrorCode.FORBIDDEN);
		}

		return member;
	}
}
