import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectNotificationSocket } from './realtimeNotifications';

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
}

describe('notification realtime API contract', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    getApiBaseUrl.mockReset();
    getApiBaseUrl.mockReturnValue('https://api.example.com');
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a short-lived ticket instead of an access token', () => {
    connectNotificationSocket({
      ticket: 'ticket with spaces',
      onNotification: vi.fn(),
    });

    expect(FakeWebSocket.instances[0].url)
      .toBe('wss://api.example.com/ws/notifications?ticket=ticket%20with%20spaces');
  });

  it('forwards valid notification events and ignores malformed frames', () => {
    const onNotification = vi.fn();
    connectNotificationSocket({
      ticket: 'single-use-ticket',
      onNotification,
    });
    const socket = FakeWebSocket.instances[0];

    socket.emitMessage(JSON.stringify({
      success: true,
      data: {
        eventType: 'NOTIFICATION_CREATED',
        notification: { id: 12, type: 'FRIEND', title: 'Friend request' },
      },
      message: null,
    }));
    socket.emitMessage('not-json');

    expect(onNotification).toHaveBeenCalledOnce();
    expect(onNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 12 }));
  });
});
