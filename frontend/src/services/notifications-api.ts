import type { NotificationItem } from '@/types/notifications';
import { USE_MOCK } from '@/services/api-config';
import { api, apiFetch } from '@/services/api-client';

export type { NotificationItem };

export async function getNotifications(token: string): Promise<NotificationItem[]> {
  if (USE_MOCK) {
    const { getNotifications: mockGetNotifications } = await import('@/mocks/functions/notifications');
    return mockGetNotifications();
  }

  return api<NotificationItem[]>('/notifications', { token, errorMessage: 'Failed to load notifications' });
}

export async function markNotificationRead(token: string, notificationId: number): Promise<void> {
  if (USE_MOCK) {
    const { markNotificationRead: mockMarkRead } = await import('@/mocks/functions/notifications');
    return mockMarkRead(notificationId);
  }

  await apiFetch(`/notifications/${notificationId}/read`, {
    method: 'PUT',
    token,
    errorMessage: 'Failed to mark notification read',
  });
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  if (USE_MOCK) {
    const { markAllNotificationsRead: mockMarkAllRead } = await import('@/mocks/functions/notifications');
    return mockMarkAllRead();
  }

  await apiFetch('/notifications/read-all', {
    method: 'PUT',
    token,
    errorMessage: 'Failed to mark all notifications read',
  });
}
