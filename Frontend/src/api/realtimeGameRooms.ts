import { getApiBaseUrl } from './client';
import type { GameRoom, GameRoomLiveState } from './gameRooms';

type ApiRealtimeResponse<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
};

export type GameRoomChangeEventType =
  | 'PARTICIPANT_JOINED'
  | 'READY_CHANGED'
  | 'GAME_STARTED'
  | 'ROOM_CANCELED';

export type GameRoomRealtimeEventType = GameRoomChangeEventType | 'LIVE_STATE_CHANGED';

export type GameRoomRealtimeMessage = {
  eventType: 'CONNECTED' | GameRoomRealtimeEventType;
  roomId: number;
  gameRoom: GameRoom | null;
  liveState: GameRoomLiveState | null;
};

type GameRoomSocketOptions = {
  accessToken: string;
  roomId: number;
  onConnected?: () => void;
  onGameRoomEvent: (eventType: GameRoomChangeEventType, gameRoom: GameRoom) => void;
  onLiveStateEvent?: (liveState: GameRoomLiveState) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
};

const getGameRoomSocketUrl = (accessToken: string, roomId: number) => {
  const wsBaseUrl = getApiBaseUrl().replace(/^http/, 'ws');
  return `${wsBaseUrl}/ws/game-rooms/${roomId}?token=${encodeURIComponent(accessToken)}`;
};

export const connectGameRoomSocket = ({
  accessToken,
  roomId,
  onConnected,
  onGameRoomEvent,
  onLiveStateEvent,
  onClose,
  onError,
}: GameRoomSocketOptions) => {
  const socket = new WebSocket(getGameRoomSocketUrl(accessToken, roomId));

  socket.onmessage = (event) => {
    try {
      const body = JSON.parse(event.data) as ApiRealtimeResponse<GameRoomRealtimeMessage>;
      const message = body.data;

      if (!body.success || !message || message.roomId !== roomId) {
        return;
      }
      if (message.eventType === 'CONNECTED') {
        onConnected?.();
        return;
      }
      if (message.eventType === 'LIVE_STATE_CHANGED' && message.liveState) {
        onLiveStateEvent?.(message.liveState);
        return;
      }
      if (message.gameRoom) {
        onGameRoomEvent(message.eventType as GameRoomChangeEventType, message.gameRoom);
      }
    } catch {
      // Ignore malformed frames and keep the current realtime connection alive.
    }
  };

  socket.onclose = (event) => {
    onClose?.(event);
  };

  socket.onerror = (event) => {
    onError?.(event);
  };

  return socket;
};
