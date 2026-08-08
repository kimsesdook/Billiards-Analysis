import { getApiBaseUrl } from './client';
import type { GameRoom } from './gameRooms';

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

export type GameRoomRealtimeMessage = {
  eventType: 'CONNECTED' | GameRoomChangeEventType;
  roomId: number;
  gameRoom: GameRoom | null;
};

type GameRoomSocketOptions = {
  accessToken: string;
  roomId: number;
  onConnected?: () => void;
  onGameRoomEvent: (eventType: GameRoomChangeEventType, gameRoom: GameRoom) => void;
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
      if (message.gameRoom) {
        onGameRoomEvent(message.eventType, message.gameRoom);
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
