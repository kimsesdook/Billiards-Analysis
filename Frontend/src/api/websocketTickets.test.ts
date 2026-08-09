import { beforeEach, describe, expect, it, vi } from 'vitest';
import { issueGameRoomWebSocketTicket, issueNotificationWebSocketTicket } from './websocketTickets';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('WebSocket ticket API', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    apiRequest.mockResolvedValue({ ticket: 'ticket', expiresInSeconds: 30 });
  });

  it('issues a notification ticket through the authenticated API client', async () => {
    await issueNotificationWebSocketTicket();

    expect(apiRequest).toHaveBeenCalledWith('/api/notifications/websocket-ticket', {
      method: 'POST',
    });
  });

  it('issues a ticket bound to the requested game room', async () => {
    await issueGameRoomWebSocketTicket(42);

    expect(apiRequest).toHaveBeenCalledWith('/api/game-rooms/42/websocket-ticket', {
      method: 'POST',
    });
  });
});
