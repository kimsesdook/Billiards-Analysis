import { describe, expect, it } from 'vitest';
import { buildGameRoomFinishPayload } from './gameRoomCompletion';

describe('game room completion payload', () => {
  it('normalizes individual inning scores to the current inning', () => {
    const payload = buildGameRoomFinishPayload({
      stateVersion: 4,
      currentInning: 3,
      gameType: '3-Cushion',
      gameMode: 'Individual',
      lastThreeCushions: 2,
      players: [
        {
          id: 1,
          memberId: 41,
          currentScore: 3,
          highRun: 2,
          inningScores: [1, undefined, 2],
        },
        {
          id: 2,
          memberId: 42,
          currentScore: 2,
          highRun: 2,
          inningScores: [0, 2],
        },
      ],
    });

    expect(payload).toEqual({
      stateVersion: 4,
      lastThreeCushions: 0,
      participants: [
        { memberId: 41, inningScores: [1, 0, 2] },
        { memberId: 42, inningScores: [0, 2, 0] },
      ],
    });
  });

  it('assigns alternating scoreboard slots to two teams', () => {
    const payload = buildGameRoomFinishPayload({
      stateVersion: 2,
      currentInning: 1,
      gameType: '4-Ball',
      gameMode: 'Team',
      lastThreeCushions: 1,
      players: [1, 2, 3, 4].map((id) => ({
        id,
        memberId: 40 + id,
        currentScore: id,
        highRun: id,
        inningScores: [id],
      })),
    });

    expect(payload.lastThreeCushions).toBe(1);
    expect(payload.participants.map((participant) => participant.teamNumber))
      .toEqual([1, 2, 1, 2]);
  });

  it('rejects a score that does not match its inning history', () => {
    expect(() => buildGameRoomFinishPayload({
      stateVersion: 1,
      currentInning: 2,
      gameType: '3-Cushion',
      gameMode: 'Individual',
      lastThreeCushions: 0,
      players: [{
        id: 1,
        memberId: 41,
        currentScore: 5,
        highRun: 3,
        inningScores: [1, 3],
      }],
    })).toThrow('점수와 이닝 기록이 일치하지 않습니다.');
  });
});
