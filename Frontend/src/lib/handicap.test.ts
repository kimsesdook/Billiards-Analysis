import { describe, expect, it } from 'vitest';
import type { GameRecord } from '../types';
import { calculateAutomaticHandicaps } from './handicap';

const record = (
  type: GameRecord['type'],
  highRun: number,
  win: boolean,
): Pick<GameRecord, 'type' | 'highRun' | 'win'> => ({ type, highRun, win });

describe('calculateAutomaticHandicaps', () => {
  it('returns stable defaults when no records exist', () => {
    expect(calculateAutomaticHandicaps([], 1)).toEqual({
      threeBallHandicap: 180,
      fourBallHandicap: 200,
    });
  });

  it('uses each game type independently', () => {
    const records = [
      record('3-Cushion', 7, true),
      record('3-Cushion', 7, true),
      record('4-Ball', 4, false),
      record('4-Ball', 4, false),
    ];

    expect(calculateAutomaticHandicaps(records, 1)).toEqual({
      threeBallHandicap: 300,
      fourBallHandicap: 120,
    });
  });

  it('adjusts four-ball handicap for the selected finish rule', () => {
    const records = [record('4-Ball', 8, true), record('4-Ball', 8, false)];

    expect(calculateAutomaticHandicaps(records, 0).fourBallHandicap).toBe(305);
    expect(calculateAutomaticHandicaps(records, 1).fourBallHandicap).toBe(250);
    expect(calculateAutomaticHandicaps(records, 2).fourBallHandicap).toBe(200);
  });
});
