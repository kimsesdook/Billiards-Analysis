import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOpponentStatistics } from './gameRecords';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('game record API contract', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('requests opponent statistics through the authenticated game record endpoint', async () => {
    apiRequest.mockResolvedValueOnce([]);

    await getOpponentStatistics();

    expect(apiRequest).toHaveBeenCalledWith('/api/game-records/opponent-statistics');
  });

  it('normalizes numeric opponent statistics returned by the backend', async () => {
    apiRequest.mockResolvedValueOnce([
      {
        opponentName: '김당구',
        totalGames: 4,
        wins: 3,
        losses: 1,
        winRate: 75,
        overallAverage: '0.456',
        bestAverage: '0.789',
        maxHighRun: 12,
        totalInnings: 40,
        totalMyScore: 18,
        totalOpponentScore: 15,
        lastPlayedAt: '2026-08-02T12:00:00Z',
      },
    ]);

    await expect(getOpponentStatistics()).resolves.toEqual([
      expect.objectContaining({
        opponentName: '김당구',
        overallAverage: 0.456,
        bestAverage: 0.789,
      }),
    ]);
  });
});
