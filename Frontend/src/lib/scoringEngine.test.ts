import { describe, expect, it } from 'vitest';
import {
  advanceScoreboardTurn,
  applyScoreChange,
  createScoreboardSnapshot,
  hasPlayerReachedTarget,
  toggleTeamCushionPhase,
  type ScoreboardPlayer,
} from './scoringEngine';

const player = (overrides: Partial<ScoreboardPlayer> = {}): ScoreboardPlayer => ({
  id: 1,
  name: '선수 1',
  targetScore: 10,
  currentScore: 0,
  cushionScore: 0,
  highRun: 0,
  inningScores: [],
  cueBallColor: 'white',
  textColor: 'text-zinc-800',
  bgColor: 'bg-white',
  borderColor: 'border-zinc-200',
  ...overrides,
});

describe('scoring engine', () => {
  it('updates the active player score and inning high run without mutating the input', () => {
    const players = [player({ currentScore: 2, highRun: 2, inningScores: [2] })];

    const result = applyScoreChange({
      players,
      activePlayerIndex: 0,
      currentInning: 2,
      currentTurnPoints: 0,
      amount: 1,
      gameType: '3-Cushion',
      lastThreeCushions: 0,
    });

    expect(result?.players[0]).toMatchObject({
      currentScore: 3,
      highRun: 2,
      inningScores: [2, 1],
    });
    expect(result?.currentTurnPoints).toBe(1);
    expect(players[0].inningScores).toEqual([2]);
  });

  it('rejects a deduction that would make the current inning negative', () => {
    const result = applyScoreChange({
      players: [player()],
      activePlayerIndex: 0,
      currentInning: 1,
      currentTurnPoints: 0,
      amount: -1,
      gameType: '3-Cushion',
      lastThreeCushions: 0,
    });

    expect(result).toBeNull();
  });

  it('moves a four-ball player into the cushion phase at the regular target', () => {
    const result = applyScoreChange({
      players: [player({ targetScore: 3, currentScore: 2, inningScores: [2] })],
      activePlayerIndex: 0,
      currentInning: 2,
      currentTurnPoints: 0,
      amount: 1,
      gameType: '4-Ball',
      lastThreeCushions: 2,
    });

    expect(result?.players[0]).toMatchObject({
      currentScore: 3,
      isCushionPhase: true,
      cushionScore: 0,
    });
    expect(result?.reachedTarget).toBe(true);
  });

  it('records finish cushions separately from regular inning scores', () => {
    const players = [player({
      targetScore: 3,
      currentScore: 3,
      highRun: 2,
      inningScores: [1, 2],
      isCushionPhase: true,
    })];

    const result = applyScoreChange({
      players,
      activePlayerIndex: 0,
      currentInning: 3,
      currentTurnPoints: 0,
      amount: 1,
      gameType: '4-Ball',
      lastThreeCushions: 2,
    });

    expect(result?.players[0]).toMatchObject({
      currentScore: 3,
      cushionScore: 1,
      highRun: 2,
      inningScores: [1, 2],
    });
  });

  it('does not allow the cushion target to be exceeded', () => {
    const result = applyScoreChange({
      players: [player({ cushionScore: 2, isCushionPhase: true })],
      activePlayerIndex: 0,
      currentInning: 1,
      currentTurnPoints: 2,
      amount: 1,
      gameType: '4-Ball',
      lastThreeCushions: 2,
    });

    expect(result).toBeNull();
  });

  it('does not deduct a cushion earned in an earlier turn', () => {
    const result = applyScoreChange({
      players: [player({ cushionScore: 1, isCushionPhase: true })],
      activePlayerIndex: 0,
      currentInning: 2,
      currentTurnPoints: 0,
      amount: -1,
      gameType: '4-Ball',
      lastThreeCushions: 2,
    });

    expect(result).toBeNull();
  });

  it('requires the configured finish cushions to complete a four-ball game', () => {
    const regularTargetPlayer = player({
      targetScore: 3,
      currentScore: 3,
      cushionScore: 1,
      isCushionPhase: true,
    });

    expect(hasPlayerReachedTarget(regularTargetPlayer, '4-Ball', 2)).toBe(false);
    expect(hasPlayerReachedTarget({ ...regularTargetPlayer, cushionScore: 2 }, '4-Ball', 2)).toBe(true);
  });

  it('skips finished players and increments the inning when the order wraps', () => {
    const result = advanceScoreboardTurn({
      players: [
        player({ id: 1 }),
        player({ id: 2, isFinished: true }),
        player({ id: 3 }),
      ],
      activePlayerIndex: 2,
      currentInning: 4,
      startingPlayerIndex: 0,
      gameType: '3-Cushion',
      lastThreeCushions: 0,
    });

    expect(result).toMatchObject({
      activePlayerIndex: 0,
      currentInning: 5,
      allPlayersFinished: false,
    });
  });

  it('marks the final active player finished and selects the winner', () => {
    const result = advanceScoreboardTurn({
      players: [
        player({ id: 1, currentScore: 10 }),
        player({ id: 2, currentScore: 8, isFinished: true }),
      ],
      activePlayerIndex: 0,
      currentInning: 3,
      startingPlayerIndex: 0,
      gameType: '3-Cushion',
      lastThreeCushions: 0,
    });

    expect(result?.newlyFinished).toBe(true);
    expect(result?.allPlayersFinished).toBe(true);
    expect(result?.winner?.id).toBe(1);
  });

  it('toggles only the selected team cushion phase', () => {
    const players = [1, 2, 3, 4].map((id) => player({ id }));

    const updated = toggleTeamCushionPhase(players, 'A');

    expect(updated.map(({ isCushionPhase }) => Boolean(isCushionPhase)))
      .toEqual([true, false, true, false]);
  });

  it('creates an undo snapshot that cannot mutate the current state', () => {
    const players = [player({ inningScores: [1] })];
    const snapshot = createScoreboardSnapshot({
      players,
      currentInning: 1,
      activePlayerIndex: 0,
      currentTurnPoints: 1,
      shotClockTime: 30,
      matchHistory: ['시작'],
    });

    players[0].inningScores[0] = 9;

    expect(snapshot.players[0].inningScores).toEqual([1]);
    expect(snapshot.matchHistory).toEqual(['시작']);
  });
});
