import { getApiBaseUrl } from './client';
import type { NotificationItem } from './notifications';

type ApiRealtimeResponse<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
};

export type NotificationRealtimeMessage = {
  eventType: 'CONNECTED' | 'NOTIFICATION_CREATED';
  notification: NotificationItem | null;
};

type NotificationSocketOptions = {
  ticket: string;
  onNotification: (notification: NotificationItem) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
};

const getNotificationSocketUrl = (ticket: string) => {
  const wsBaseUrl = getApiBaseUrl().replace(/^http/, 'ws');
  return `${wsBaseUrl}/ws/notifications?ticket=${encodeURIComponent(ticket)}`;
};

export const connectNotificationSocket = ({
  ticket,
  onNotification,
  onClose,
  onError,
}: NotificationSocketOptions) => {
  const socket = new WebSocket(getNotificationSocketUrl(ticket));

  socket.onmessage = (event) => {
    try {
      const body = JSON.parse(event.data) as ApiRealtimeResponse<NotificationRealtimeMessage>;
      if (
        body.success
        && body.data?.eventType === 'NOTIFICATION_CREATED'
        && body.data.notification
      ) {
        onNotification(body.data.notification);
      }
    } catch {
      // Ignore malformed realtime frames so one bad message does not break the session.
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
