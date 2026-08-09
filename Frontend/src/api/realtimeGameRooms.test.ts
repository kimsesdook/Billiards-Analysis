import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectGameRoomSocket } from './realtimeGameRooms';

const getApiBaseUrl = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  getApiBaseUrl,
}));

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  emitMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent);
  }

  close() {
    this.onclose?.({ code: 1000 } as CloseEvent);
  }
}

describe('game room realtime API contract', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    getApiBaseUrl.mockReset();
    getApiBaseUrl.mockReturnValue('https://api.example.com');
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connects to the authenticated room WebSocket endpoint', () => {
    connectGameRoomSocket({
      ticket: 'ticket with spaces',
      roomId: 7,
      onGameRoomEvent: vi.fn(),
    });

    expect(FakeWebSocket.instances[0].url)
      .toBe('wss://api.example.com/ws/game-rooms/7?ticket=ticket%20with%20spaces');
  });

  it('forwards matching room and live-state events while ignoring invalid frames', () => {
    const onConnected = vi.fn();
    const onGameRoomEvent = vi.fn();
    const onLiveStateEvent = vi.fn();

    connectGameRoomSocket({
      ticket: 'single-use-ticket',
      roomId: 7,
      onConnected,
      onGameRoomEvent,
      onLiveStateEvent,
    });
    const socket = FakeWebSocket.instances[0];

    socket.emitMessage(JSON.stringify({
      success: true,
      data: { eventType: 'CONNECTED', roomId: 7, gameRoom: null },
      message: null,
    }));
    socket.emitMessage(JSON.stringify({
      success: true,
      data: {
        eventType: 'READY_CHANGED',
        roomId: 7,
        gameRoom: { roomId: 7, status: 'WAITING' },
      },
      message: null,
    }));
    socket.emitMessage(JSON.stringify({
      success: true,
      data: {
        eventType: 'LIVE_STATE_CHANGED',
        roomId: 7,
        gameRoom: null,
        liveState: {
          roomId: 7,
          status: 'IN_PROGRESS',
          stateVersion: 4,
          currentInning: 3,
          activeMemberId: 42,
          scores: [],
        },
      },
      message: null,
    }));
    socket.emitMessage(JSON.stringify({
      success: true,
      data: {
        eventType: 'GAME_FINISHED',
        roomId: 7,
        gameRoom: { roomId: 7, status: 'FINISHED' },
      },
      message: null,
    }));
    socket.emitMessage(JSON.stringify({
      success: true,
      data: {
        eventType: 'GAME_STARTED',
        roomId: 8,
        gameRoom: { roomId: 8, status: 'IN_PROGRESS' },
      },
      message: null,
    }));
    socket.emitMessage('not-json');

    expect(onConnected).toHaveBeenCalledOnce();
    expect(onGameRoomEvent).toHaveBeenCalledTimes(2);
    expect(onGameRoomEvent).toHaveBeenNthCalledWith(
      1,
      'READY_CHANGED',
      expect.objectContaining({ roomId: 7, status: 'WAITING' }),
    );
    expect(onGameRoomEvent).toHaveBeenNthCalledWith(
      2,
      'GAME_FINISHED',
      expect.objectContaining({ roomId: 7, status: 'FINISHED' }),
    );
    expect(onLiveStateEvent).toHaveBeenCalledOnce();
    expect(onLiveStateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 7, stateVersion: 4, activeMemberId: 42 }),
    );
  });
});
