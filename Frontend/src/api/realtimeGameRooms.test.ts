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
      accessToken: 'token with spaces',
      roomId: 7,
      onGameRoomEvent: vi.fn(),
    });

    expect(FakeWebSocket.instances[0].url)
      .toBe('wss://api.example.com/ws/game-rooms/7?token=token%20with%20spaces');
  });

  it('forwards connected and matching room events while ignoring invalid frames', () => {
    const onConnected = vi.fn();
    const onGameRoomEvent = vi.fn();

    connectGameRoomSocket({
      accessToken: 'access-token',
      roomId: 7,
      onConnected,
      onGameRoomEvent,
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
        eventType: 'GAME_STARTED',
        roomId: 8,
        gameRoom: { roomId: 8, status: 'IN_PROGRESS' },
      },
      message: null,
    }));
    socket.emitMessage('not-json');

    expect(onConnected).toHaveBeenCalledOnce();
    expect(onGameRoomEvent).toHaveBeenCalledOnce();
    expect(onGameRoomEvent).toHaveBeenCalledWith(
      'READY_CHANGED',
      expect.objectContaining({ roomId: 7, status: 'WAITING' }),
    );
  });
});
