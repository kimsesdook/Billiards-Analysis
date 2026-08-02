import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptGameInvitation,
  createGameInvitation,
  declineGameInvitation,
  getGameInvitations,
} from './gameInvitations';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('game invitation API contract', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('creates an invitation for a selected friend and game type', () => {
    createGameInvitation(42, '3-Cushion');

    expect(apiRequest).toHaveBeenCalledWith('/api/game-invitations', {
      method: 'POST',
      body: JSON.stringify({ receiverMemberId: 42, gameType: '3-Cushion' }),
    });
  });

  it('loads pending incoming and outgoing invitations', () => {
    getGameInvitations();

    expect(apiRequest).toHaveBeenCalledWith('/api/game-invitations');
  });

  it('accepts and declines the selected invitation', () => {
    acceptGameInvitation(42);
    declineGameInvitation(42);

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/game-invitations/42/accept', {
      method: 'PATCH',
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/game-invitations/42/decline', {
      method: 'PATCH',
    });
  });
});
