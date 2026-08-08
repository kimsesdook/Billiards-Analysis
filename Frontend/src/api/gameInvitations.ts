import type { GameType } from '../types';
import { apiRequest } from './client';

export type GameInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
export type GameInvitationDirection = 'INCOMING' | 'OUTGOING';

export type GameInvitationMember = {
  id: number;
  name: string;
  nickname: string;
  targetCushionCount: number;
  threeBallHandicap: number;
  fourBallHandicap: number;
};

export type GameInvitation = {
  invitationId: number;
  gameRoomId: number | null;
  member: GameInvitationMember;
  gameType: GameType;
  status: GameInvitationStatus;
  direction: GameInvitationDirection;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
};

export type GameInvitations = {
  incoming: GameInvitation[];
  outgoing: GameInvitation[];
};

export const createGameInvitation = (
  receiverMemberId: number,
  gameType: GameType,
  gameRoomId?: number,
) =>
  apiRequest<GameInvitation>('/api/game-invitations', {
    method: 'POST',
    body: JSON.stringify({
      receiverMemberId,
      gameType,
      ...(gameRoomId !== undefined ? { gameRoomId } : {}),
    }),
  });

export const getGameInvitations = () =>
  apiRequest<GameInvitations>('/api/game-invitations');

export const acceptGameInvitation = (invitationId: number) =>
  apiRequest<GameInvitation>(`/api/game-invitations/${invitationId}/accept`, {
    method: 'PATCH',
  });

export const declineGameInvitation = (invitationId: number) =>
  apiRequest<GameInvitation>(`/api/game-invitations/${invitationId}/decline`, {
    method: 'PATCH',
  });
