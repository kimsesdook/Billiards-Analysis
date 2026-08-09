import { apiRequest } from './client';

export type WebSocketTicket = {
  ticket: string;
  expiresInSeconds: number;
};

export const issueNotificationWebSocketTicket = () =>
  apiRequest<WebSocketTicket>('/api/notifications/websocket-ticket', {
    method: 'POST',
  });

export const issueGameRoomWebSocketTicket = (roomId: number) =>
  apiRequest<WebSocketTicket>(`/api/game-rooms/${roomId}/websocket-ticket`, {
    method: 'POST',
  });
