import type { GameType } from '../types';

export type LastThreeCushions = 0 | 1 | 2;

export interface ScoreboardPlayer {
  id: number;
  memberId?: number;
  name: string;
  targetScore: number;
  currentScore: number;
  cushionScore?: number;
  highRun: number;
  inningScores: number[];
  cueBallColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  isCushionPhase?: boolean;
  isFinished?: boolean;
  isMe?: boolean;
}

export interface ScoreboardSnapshot {
  players: ScoreboardPlayer[];
  currentInning: number;
  activePlayerIndex: number;
  currentTurnPoints: number;
  shotClockTime: number;
  matchHistory: string[];
}

interface ApplyScoreChangeOptions {
  players: ScoreboardPlayer[];
  activePlayerIndex: number;
  currentInning: number;
  currentTurnPoints: number;
  amount: number;
  gameType: GameType;
  lastThreeCushions: LastThreeCushions;
}

export interface ScoreChangeResult {
  players: ScoreboardPlayer[];
  currentTurnPoints: number;
  reachedTarget: boolean;
}

interface AdvanceTurnOptions {
  players: ScoreboardPlayer[];
  activePlayerIndex: number;
  currentInning: number;
  startingPlayerIndex: number;
  gameType: GameType;
  lastThreeCushions: LastThreeCushions;
}

export interface AdvanceTurnResult {
  players: ScoreboardPlayer[];
  activePlayerIndex: number;
  currentInning: number;
  newlyFinished: boolean;
  allPlayersFinished: boolean;
  winner: ScoreboardPlayer | null;
}

interface CreateSnapshotOptions {
  players: ScoreboardPlayer[];
  currentInning: number;
  activePlayerIndex: number;
  currentTurnPoints: number;
  shotClockTime: number;
  matchHistory: string[];
}

const copyPlayers = (players: ScoreboardPlayer[]) => players.map((player) => ({
  ...player,
  inningScores: [...player.inningScores],
}));

const replacePlayer = (
  players: ScoreboardPlayer[],
  playerIndex: number,
  updatedPlayer: ScoreboardPlayer,
) => players.map((player, index) => (index === playerIndex ? updatedPlayer : player));

export const createScoreboardSnapshot = ({
  players,
  currentInning,
  activePlayerIndex,
  currentTurnPoints,
  shotClockTime,
  matchHistory,
}: CreateSnapshotOptions): ScoreboardSnapshot => ({
  players: copyPlayers(players),
  currentInning,
  activePlayerIndex,
  currentTurnPoints,
  shotClockTime,
  matchHistory: [...matchHistory],
});

export const applyScoreChange = ({
  players,
  activePlayerIndex,
  currentInning,
  currentTurnPoints,
  amount,
  gameType,
  lastThreeCushions,
}: ApplyScoreChangeOptions): ScoreChangeResult | null => {
  const activePlayer = players[activePlayerIndex];
  if (!activePlayer || !Number.isInteger(amount) || amount === 0 || currentInning < 1) {
    return null;
  }

  const isCushionPhase = gameType === '4-Ball'
    && lastThreeCushions > 0
    && activePlayer.isCushionPhase;

  if (isCushionPhase) {
    const cushionScore = activePlayer.cushionScore || 0;
    const nextCushionScore = cushionScore + amount;
    const nextTurnPoints = currentTurnPoints + amount;
    if (
      nextCushionScore < 0
      || nextCushionScore > lastThreeCushions
      || nextTurnPoints < 0
    ) {
      return null;
    }

    return {
      players: replacePlayer(players, activePlayerIndex, {
        ...activePlayer,
        cushionScore: nextCushionScore,
      }),
      currentTurnPoints: nextTurnPoints,
      reachedTarget: nextCushionScore === lastThreeCushions,
    };
  }

  const nextTurnPoints = currentTurnPoints + amount;
  if (nextTurnPoints < 0) {
    return null;
  }

  const inningIndex = currentInning - 1;
  const previousInningScore = activePlayer.inningScores[inningIndex] || 0;
  const nextScore = activePlayer.currentScore - previousInningScore + nextTurnPoints;
  const inningScores = [...activePlayer.inningScores];
  inningScores[inningIndex] = nextTurnPoints;
  const updatedPlayer: ScoreboardPlayer = {
    ...activePlayer,
    currentScore: nextScore,
    highRun: Math.max(0, ...inningScores),
    inningScores,
    ...(gameType === '4-Ball' && lastThreeCushions > 0
      ? { isCushionPhase: nextScore >= activePlayer.targetScore }
      : {}),
  };

  return {
    players: replacePlayer(players, activePlayerIndex, updatedPlayer),
    currentTurnPoints: nextTurnPoints,
    reachedTarget: nextScore >= activePlayer.targetScore,
  };
};

export const hasPlayerReachedTarget = (
  player: ScoreboardPlayer,
  gameType: GameType,
  lastThreeCushions: LastThreeCushions,
) => {
  if (gameType !== '4-Ball' || lastThreeCushions === 0) {
    return player.currentScore >= player.targetScore;
  }

  return Boolean(
    player.isCushionPhase
    && (player.cushionScore || 0) >= lastThreeCushions,
  );
};

export const selectScoreboardWinner = (
  players: ScoreboardPlayer[],
  gameType: GameType,
  lastThreeCushions: LastThreeCushions,
) => [...players].sort((left, right) => {
  const finishedDifference = Number(Boolean(right.isFinished)) - Number(Boolean(left.isFinished));
  if (finishedDifference !== 0) {
    return finishedDifference;
  }
  if (gameType === '4-Ball' && lastThreeCushions > 0) {
    return (right.cushionScore || 0) - (left.cushionScore || 0);
  }
  return right.currentScore - left.currentScore;
})[0] || null;

export const advanceScoreboardTurn = ({
  players,
  activePlayerIndex,
  currentInning,
  startingPlayerIndex,
  gameType,
  lastThreeCushions,
}: AdvanceTurnOptions): AdvanceTurnResult | null => {
  const activePlayer = players[activePlayerIndex];
  if (!activePlayer || players.length === 0) {
    return null;
  }

  const newlyFinished = hasPlayerReachedTarget(activePlayer, gameType, lastThreeCushions)
    && !activePlayer.isFinished;
  const updatedPlayers = newlyFinished
    ? replacePlayer(players, activePlayerIndex, { ...activePlayer, isFinished: true })
    : players;

  let nextPlayerIndex = activePlayerIndex;
  let nextInning = currentInning;

  for (let step = 1; step <= updatedPlayers.length; step += 1) {
    const candidateIndex = (activePlayerIndex + step) % updatedPlayers.length;
    if (candidateIndex === startingPlayerIndex) {
      nextInning += 1;
    }
    if (!updatedPlayers[candidateIndex].isFinished) {
      nextPlayerIndex = candidateIndex;
      return {
        players: updatedPlayers,
        activePlayerIndex: nextPlayerIndex,
        currentInning: nextInning,
        newlyFinished,
        allPlayersFinished: false,
        winner: null,
      };
    }
  }

  return {
    players: updatedPlayers,
    activePlayerIndex: nextPlayerIndex,
    currentInning: nextInning,
    newlyFinished,
    allPlayersFinished: true,
    winner: selectScoreboardWinner(updatedPlayers, gameType, lastThreeCushions),
  };
};

export const buildTurnHistoryEntry = (
  player: ScoreboardPlayer,
  currentInning: number,
  currentTurnPoints: number,
  gameType: GameType,
  lastThreeCushions: LastThreeCushions,
) => {
  const cushionSuffix = gameType === '4-Ball' && lastThreeCushions > 0
    ? ` (3쿠션: ${player.cushionScore || 0}/${lastThreeCushions})`
    : '';

  return `[이닝 ${currentInning}] ${player.name}: +${currentTurnPoints}점 (누적: ${player.currentScore}점)${cushionSuffix}`;
};

export const toggleTeamCushionPhase = (
  players: ScoreboardPlayer[],
  teamId: 'A' | 'B',
  forceState?: boolean,
) => {
  const playerIds = teamId === 'A' ? [1, 3] : [2, 4];
  const isCurrentlyCushion = players.some((player) => (
    playerIds.includes(player.id) && player.isCushionPhase
  ));
  const nextState = forceState ?? !isCurrentlyCushion;

  return players.map((player) => (
    playerIds.includes(player.id)
      ? { ...player, isCushionPhase: nextState }
      : player
  ));
};

export const activatePlayerCushionPhase = (
  players: ScoreboardPlayer[],
  activePlayerIndex: number,
) => players.map((player, index) => (
  index === activePlayerIndex
    ? { ...player, isCushionPhase: true }
    : player
));
