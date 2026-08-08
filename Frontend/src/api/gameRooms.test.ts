import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelGameRoom,
  createGameRoom,
  getGameRoom,
  getMyGameRooms,
  startGameRoom,
  updateGameRoomReady,
} from './gameRooms';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('game room API contract', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('creates a game room with the selected match settings', () => {
    createGameRoom({
      name: 'Friday Match',
      gameType: '3-Cushion',
      gameMode: 'Individual',
      playerCapacity: 2,
      hostTargetScore: 20,
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/game-rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Friday Match',
        gameType: '3-Cushion',
        gameMode: 'Individual',
        playerCapacity: 2,
        hostTargetScore: 20,
      }),
    });
  });

  it('loads one room and the authenticated members rooms', () => {
    getGameRoom(7);
    getMyGameRooms();

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/game-rooms/7');
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/game-rooms');
  });

  it('cancels a waiting game room', () => {
    cancelGameRoom(7);

    expect(apiRequest).toHaveBeenCalledWith('/api/game-rooms/7/cancel', {
      method: 'PATCH',
    });
  });

  it('updates a participants ready state', () => {
    updateGameRoomReady(7, true);

    expect(apiRequest).toHaveBeenCalledWith('/api/game-rooms/7/ready', {
      method: 'PATCH',
      body: JSON.stringify({ ready: true }),
    });
  });

  it('starts a ready game room', () => {
    startGameRoom(7);

    expect(apiRequest).toHaveBeenCalledWith('/api/game-rooms/7/start', {
      method: 'PATCH',
    });
  });
});
