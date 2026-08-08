import type { GameMode, GameType } from '../types';
import { apiRequest } from './client';

export type GameRoomStatus = 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
export type GameRoomParticipantRole = 'HOST' | 'PLAYER';

export type GameRoomParticipant = {
  memberId: number;
  nickname: string;
  role: GameRoomParticipantRole;
  targetScore: number;
  ready: boolean;
};

export type GameRoom = {
  roomId: number;
  name: string;
  joinCode: string;
  hostMemberId: number;
  hostNickname: string;
  gameType: GameType;
  gameMode: GameMode;
  playerCapacity: number;
  status: GameRoomStatus;
  participants: GameRoomParticipant[];
  createdAt: string;
  updatedAt: string;
};

export type GameRoomCreatePayload = {
  name: string;
  gameType: GameType;
  gameMode: GameMode;
  playerCapacity: number;
  hostTargetScore: number;
};

export type GameRoomLiveScore = {
  memberId: number;
  nickname: string;
  targetScore: number;
  currentScore: number;
  cushionScore: number;
  highRun: number;
};

export type GameRoomLiveState = {
  roomId: number;
  status: GameRoomStatus;
  stateVersion: number;
  currentInning: number;
  activeMemberId: number;
  scores: GameRoomLiveScore[];
};

export type GameRoomLiveStateUpdatePayload = {
  stateVersion: number;
  currentInning: number;
  activeMemberId: number;
  scores: Array<{
    memberId: number;
    currentScore: number;
    cushionScore: number;
    highRun: number;
  }>;
};

export type GameRoomFinishPayload = {
  stateVersion: number;
  lastThreeCushions: number;
  participants: Array<{
    memberId: number;
    inningScores: number[];
    teamNumber?: 1 | 2;
  }>;
};

export type GameRoomFinishedRecord = {
  memberId: number;
  nickname: string;
  gameRecordId: number;
  score: number;
  opponentScore: number;
  rank: number | null;
  win: boolean;
};

export type GameRoomFinishResponse = {
  roomId: number;
  status: 'FINISHED';
  stateVersion: number;
  playedAt: string;
  records: GameRoomFinishedRecord[];
};

export const createGameRoom = (payload: GameRoomCreatePayload) =>
  apiRequest<GameRoom>('/api/game-rooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getGameRoom = (roomId: number) =>
  apiRequest<GameRoom>(`/api/game-rooms/${roomId}`);

export const getMyGameRooms = () =>
  apiRequest<GameRoom[]>('/api/game-rooms');

export const cancelGameRoom = (roomId: number) =>
  apiRequest<GameRoom>(`/api/game-rooms/${roomId}/cancel`, {
    method: 'PATCH',
  });

export const updateGameRoomReady = (roomId: number, ready: boolean) =>
  apiRequest<GameRoom>(`/api/game-rooms/${roomId}/ready`, {
    method: 'PATCH',
    body: JSON.stringify({ ready }),
  });

export const startGameRoom = (roomId: number) =>
  apiRequest<GameRoom>(`/api/game-rooms/${roomId}/start`, {
    method: 'PATCH',
  });

export const finishGameRoom = (roomId: number, payload: GameRoomFinishPayload) =>
  apiRequest<GameRoomFinishResponse>(`/api/game-rooms/${roomId}/finish`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const getGameRoomLiveState = (roomId: number) =>
  apiRequest<GameRoomLiveState>(`/api/game-rooms/${roomId}/live-state`);

export const updateGameRoomLiveState = (
  roomId: number,
  payload: GameRoomLiveStateUpdatePayload,
) => apiRequest<GameRoomLiveState>(`/api/game-rooms/${roomId}/live-state`, {
  method: 'PUT',
  body: JSON.stringify(payload),
});
