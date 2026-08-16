import type { GameRoomStatus } from '../api/gameRooms';
import type { GameMode, GameType } from '../types';
import type {
  LastThreeCushions,
  ScoreboardPlayer,
  ScoreboardSnapshot,
} from './scoringEngine';

export const ACTIVE_GAME_STORAGE_KEY = 'billiards_active_room_state';
export const ACTIVE_GAME_STORAGE_VERSION = 1;
export const MAX_PERSISTED_UNDO_STATES = 20;

export interface ActiveGameState {
  type: GameType;
  mode: GameMode;
  playerCount: 2 | 3 | 4;
  lastThreeCushions: LastThreeCushions;
  players: ScoreboardPlayer[];
  currentInning: number;
  activePlayerIndex: number;
  startingPlayerIndex: number;
  currentTurnPoints: number;
  gameTime: number;
  enableShotClock: boolean;
  shotClockLimit: number;
  shotClockTime: number;
  notes: string;
  matchHistory: string[];
  stateHistory: ScoreboardSnapshot[];
  gameRoomId: number | null;
  gameRoomStatus: GameRoomStatus | null;
  isGameRoomHost: boolean;
}

export interface PersistedActiveGameState extends ActiveGameState {
  version: typeof ACTIVE_GAME_STORAGE_VERSION;
  savedAt: number;
}

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isIntegerAtLeast = (value: unknown, minimum: number): value is number => (
  typeof value === 'number' && Number.isInteger(value) && value >= minimum
);

const isOptionalBoolean = (value: unknown) => value === undefined || typeof value === 'boolean';

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((item) => typeof item === 'string')
);

const isNonNegativeIntegerArray = (value: unknown): value is number[] => (
  Array.isArray(value) && value.every((item) => isIntegerAtLeast(item, 0))
);

const isScoreboardPlayer = (value: unknown): value is ScoreboardPlayer => {
  if (!isRecord(value)) {
    return false;
  }

  return isIntegerAtLeast(value.id, 1)
    && (value.memberId === undefined || isIntegerAtLeast(value.memberId, 1))
    && typeof value.name === 'string'
    && isIntegerAtLeast(value.targetScore, 1)
    && isIntegerAtLeast(value.currentScore, 0)
    && (value.cushionScore === undefined || isIntegerAtLeast(value.cushionScore, 0))
    && isIntegerAtLeast(value.highRun, 0)
    && isNonNegativeIntegerArray(value.inningScores)
    && typeof value.cueBallColor === 'string'
    && typeof value.textColor === 'string'
    && typeof value.bgColor === 'string'
    && typeof value.borderColor === 'string'
    && isOptionalBoolean(value.isCushionPhase)
    && isOptionalBoolean(value.isFinished)
    && isOptionalBoolean(value.isMe);
};

const isScoreboardSnapshot = (value: unknown): value is ScoreboardSnapshot => {
  if (!isRecord(value) || !Array.isArray(value.players) || value.players.length === 0) {
    return false;
  }

  return value.players.every(isScoreboardPlayer)
    && isIntegerAtLeast(value.currentInning, 1)
    && isIntegerAtLeast(value.activePlayerIndex, 0)
    && value.activePlayerIndex < value.players.length
    && isIntegerAtLeast(value.currentTurnPoints, 0)
    && isIntegerAtLeast(value.shotClockTime, 0)
    && isStringArray(value.matchHistory);
};

const isGameRoomStatus = (value: unknown): value is GameRoomStatus => (
  value === 'WAITING'
  || value === 'IN_PROGRESS'
  || value === 'FINISHED'
  || value === 'CANCELED'
);

const isPersistedActiveGameState = (value: unknown): value is PersistedActiveGameState => {
  if (!isRecord(value) || !Array.isArray(value.players) || value.players.length === 0) {
    return false;
  }

  return value.version === ACTIVE_GAME_STORAGE_VERSION
    && isIntegerAtLeast(value.savedAt, 0)
    && (value.type === '3-Cushion' || value.type === '4-Ball')
    && (value.mode === 'Individual' || value.mode === 'Team')
    && (value.playerCount === 2 || value.playerCount === 3 || value.playerCount === 4)
    && (value.lastThreeCushions === 0 || value.lastThreeCushions === 1 || value.lastThreeCushions === 2)
    && value.players.length === value.playerCount
    && value.players.every(isScoreboardPlayer)
    && isIntegerAtLeast(value.currentInning, 1)
    && isIntegerAtLeast(value.activePlayerIndex, 0)
    && value.activePlayerIndex < value.players.length
    && isIntegerAtLeast(value.startingPlayerIndex, 0)
    && value.startingPlayerIndex < value.players.length
    && isIntegerAtLeast(value.currentTurnPoints, 0)
    && isIntegerAtLeast(value.gameTime, 0)
    && typeof value.enableShotClock === 'boolean'
    && isIntegerAtLeast(value.shotClockLimit, 1)
    && isIntegerAtLeast(value.shotClockTime, 0)
    && typeof value.notes === 'string'
    && isStringArray(value.matchHistory)
    && Array.isArray(value.stateHistory)
    && value.stateHistory.length <= MAX_PERSISTED_UNDO_STATES
    && value.stateHistory.every(isScoreboardSnapshot)
    && (value.gameRoomId === null || isIntegerAtLeast(value.gameRoomId, 1))
    && (value.gameRoomStatus === null || isGameRoomStatus(value.gameRoomStatus))
    && typeof value.isGameRoomHost === 'boolean';
};

export const clearActiveGameState = (storage: KeyValueStorage) => {
  try {
    storage.removeItem(ACTIVE_GAME_STORAGE_KEY);
  } catch {
    // Storage access can be blocked by browser privacy settings.
  }
};

export const loadActiveGameState = (
  storage: KeyValueStorage,
): PersistedActiveGameState | null => {
  try {
    const serialized = storage.getItem(ACTIVE_GAME_STORAGE_KEY);
    if (!serialized) {
      return null;
    }

    const parsed: unknown = JSON.parse(serialized);
    if (!isPersistedActiveGameState(parsed)) {
      clearActiveGameState(storage);
      return null;
    }

    return parsed;
  } catch {
    clearActiveGameState(storage);
    return null;
  }
};

export const saveActiveGameState = (
  storage: KeyValueStorage,
  state: ActiveGameState,
  savedAt = Date.now(),
) => {
  const persistedState: PersistedActiveGameState = {
    ...state,
    stateHistory: state.stateHistory.slice(-MAX_PERSISTED_UNDO_STATES),
    version: ACTIVE_GAME_STORAGE_VERSION,
    savedAt,
  };

  try {
    storage.setItem(ACTIVE_GAME_STORAGE_KEY, JSON.stringify(persistedState));
    return true;
  } catch {
    return false;
  }
};
