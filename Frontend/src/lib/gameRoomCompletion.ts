import type { GameRoomFinishPayload } from '../api/gameRooms';
import type { GameMode, GameType } from '../types';

type CompletionPlayerSnapshot = {
  id: number;
  memberId?: number;
  currentScore: number;
  highRun: number;
  inningScores: Array<number | undefined>;
};

type BuildGameRoomFinishPayloadOptions = {
  stateVersion: number;
  currentInning: number;
  gameType: GameType;
  gameMode: GameMode;
  lastThreeCushions: number;
  players: CompletionPlayerSnapshot[];
};

const MAX_RECORDED_INNINGS = 500;

export const buildGameRoomFinishPayload = ({
  stateVersion,
  currentInning,
  gameType,
  gameMode,
  lastThreeCushions,
  players,
}: BuildGameRoomFinishPayloadOptions): GameRoomFinishPayload => {
  const inningCount = Math.max(1, currentInning);
  if (stateVersion < 0 || inningCount > MAX_RECORDED_INNINGS) {
    throw new Error('경기 종료 정보를 준비할 수 없습니다.');
  }

  const participants = players.map((player) => {
    if (!player.memberId) {
      throw new Error('참가자 정보를 다시 불러온 후 종료해 주세요.');
    }

    const inningScores = Array.from(
      { length: inningCount },
      (_, index) => player.inningScores[index] ?? 0,
    );
    const scoreTotal = inningScores.reduce((total, score) => total + score, 0);
    const highRun = Math.max(0, ...inningScores);
    if (scoreTotal !== player.currentScore || highRun !== player.highRun) {
      throw new Error('점수와 이닝 기록이 일치하지 않습니다. 점수판을 확인해 주세요.');
    }

    const teamNumber = gameMode === 'Team'
      ? (player.id === 1 || player.id === 3 ? 1 : 2)
      : undefined;

    return {
      memberId: player.memberId,
      inningScores,
      ...(teamNumber ? { teamNumber: teamNumber as 1 | 2 } : {}),
    };
  });

  return {
    stateVersion,
    lastThreeCushions: gameType === '4-Ball' ? lastThreeCushions : 0,
    participants,
  };
};
