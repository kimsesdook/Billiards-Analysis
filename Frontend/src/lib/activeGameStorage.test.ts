import { describe, expect, it } from 'vitest';
import {
  ACTIVE_GAME_STORAGE_KEY,
  ACTIVE_GAME_STORAGE_VERSION,
  MAX_PERSISTED_UNDO_STATES,
  clearActiveGameState,
  loadActiveGameState,
  saveActiveGameState,
  type ActiveGameState,
} from './activeGameStorage';
import type { ScoreboardPlayer, ScoreboardSnapshot } from './scoringEngine';

const player = (overrides: Partial<ScoreboardPlayer> = {}): ScoreboardPlayer => ({
  id: 1,
  memberId: 41,
  name: '선수 1',
  targetScore: 15,
  currentScore: 2,
  cushionScore: 0,
  highRun: 2,
  inningScores: [2],
  cueBallColor: 'white',
  textColor: 'text-zinc-800',
  bgColor: 'bg-white',
  borderColor: 'border-zinc-200',
  isCushionPhase: false,
  isFinished: false,
  isMe: true,
  ...overrides,
});

const snapshot = (index = 0): ScoreboardSnapshot => ({
  players: [player(), player({ id: 2, memberId: 42, name: '선수 2', isMe: false })],
  currentInning: 1,
  activePlayerIndex: 0,
  currentTurnPoints: index,
  shotClockTime: 30,
  matchHistory: [`기록 ${index}`],
});

const activeGame = (overrides: Partial<ActiveGameState> = {}): ActiveGameState => ({
  type: '4-Ball',
  mode: 'Individual',
  playerCount: 2,
  lastThreeCushions: 2,
  players: [player(), player({ id: 2, memberId: 42, name: '선수 2', isMe: false })],
  currentInning: 1,
  activePlayerIndex: 0,
  startingPlayerIndex: 1,
  currentTurnPoints: 2,
  gameTime: 120,
  enableShotClock: true,
  shotClockLimit: 30,
  shotClockTime: 17,
  notes: '복구 테스트',
  matchHistory: ['경기 시작'],
  stateHistory: [snapshot()],
  gameRoomId: 9,
  gameRoomStatus: 'IN_PROGRESS',
  isGameRoomHost: true,
  ...overrides,
});

const memoryStorage = (initialValue?: string) => {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(ACTIVE_GAME_STORAGE_KEY, initialValue);
  }

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe('active game storage', () => {
  it('round-trips every setting required to resume a game', () => {
    const storage = memoryStorage();

    expect(saveActiveGameState(storage, activeGame(), 1234)).toBe(true);

    expect(loadActiveGameState(storage)).toMatchObject({
      version: ACTIVE_GAME_STORAGE_VERSION,
      savedAt: 1234,
      lastThreeCushions: 2,
      startingPlayerIndex: 1,
      enableShotClock: true,
      shotClockLimit: 30,
      shotClockTime: 17,
      gameRoomStatus: 'IN_PROGRESS',
    });
  });

  it('removes malformed JSON instead of throwing during startup', () => {
    const storage = memoryStorage('{broken');

    expect(loadActiveGameState(storage)).toBeNull();
    expect(storage.getItem(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it('rejects an unversioned legacy state whose rules cannot be restored safely', () => {
    const storage = memoryStorage(JSON.stringify(activeGame()));

    expect(loadActiveGameState(storage)).toBeNull();
    expect(storage.getItem(ACTIVE_GAME_STORAGE_KEY)).toBeNull();
  });

  it('rejects an unsupported future schema version', () => {
    const storage = memoryStorage();
    saveActiveGameState(storage, activeGame(), 1234);
    const stored = JSON.parse(storage.getItem(ACTIVE_GAME_STORAGE_KEY) || '{}');
    storage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify({ ...stored, version: 2 }));

    expect(loadActiveGameState(storage)).toBeNull();
  });

  it('rejects invalid nested player data', () => {
    const storage = memoryStorage();
    saveActiveGameState(storage, activeGame(), 1234);
    const stored = JSON.parse(storage.getItem(ACTIVE_GAME_STORAGE_KEY) || '{}');
    stored.players[0].currentScore = -1;
    storage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(stored));

    expect(loadActiveGameState(storage)).toBeNull();
  });

  it('keeps only the newest undo snapshots to control storage growth', () => {
    const storage = memoryStorage();
    const stateHistory = Array.from(
      { length: MAX_PERSISTED_UNDO_STATES + 5 },
      (_, index) => snapshot(index),
    );

    saveActiveGameState(storage, activeGame({ stateHistory }), 1234);
    const restored = loadActiveGameState(storage);

    expect(restored?.stateHistory).toHaveLength(MAX_PERSISTED_UNDO_STATES);
    expect(restored?.stateHistory[0].currentTurnPoints).toBe(5);
  });

  it('returns false when browser storage rejects a write', () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error('quota exceeded'); },
      removeItem: () => undefined,
    };

    expect(saveActiveGameState(storage, activeGame())).toBe(false);
  });

  it('returns null when browser privacy settings block read access', () => {
    const storage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    expect(loadActiveGameState(storage)).toBeNull();
  });

  it('clears saved state without exposing storage errors', () => {
    const storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => { throw new Error('blocked'); },
    };

    expect(() => clearActiveGameState(storage)).not.toThrow();
  });
});
