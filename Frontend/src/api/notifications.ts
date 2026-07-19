import { apiRequest } from './client';

export type NotificationType = 'FRIEND' | 'MATCH' | 'REPORT' | 'SYSTEM';

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedResourceType: string | null;
  relatedResourceId: number | null;
  createdAt: string;
};

export const getNotifications = () => apiRequest<NotificationItem[]>('/api/notifications');

export const getUnreadNotificationCount = () => apiRequest<number>('/api/notifications/unread-count');

export const markNotificationAsRead = (notificationId: number) =>
  apiRequest<NotificationItem>(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

export const markAllNotificationsAsRead = () =>
  apiRequest<void>('/api/notifications/read-all', {
    method: 'PATCH',
  });

export const deleteNotification = (notificationId: number) =>
  apiRequest<void>(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
  });

export const deleteAllNotifications = () =>
  apiRequest<void>('/api/notifications', {
    method: 'DELETE',
  });
