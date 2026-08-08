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
