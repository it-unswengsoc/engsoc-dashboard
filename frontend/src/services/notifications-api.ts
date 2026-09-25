import type { NotificationItem } from '@/types/notifications';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { NotificationItem };

export async function getNotifications(token: string): Promise<NotificationItem[]> {
  if (USE_MOCK) {
    const { getNotifications: mockGetNotifications } = await import('@/mocks/functions/notifications');
    return mockGetNotifications();
  }

  const res = await fetch(apiUrl('/notifications'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load notifications');
  return data.data as NotificationItem[];
}

export async function markNotificationRead(token: string, notificationId: number): Promise<void> {
  if (USE_MOCK) {
    const { markNotificationRead: mockMarkRead } = await import('@/mocks/functions/notifications');
    return mockMarkRead(notificationId);
  }

  const res = await fetch(apiUrl(`/notifications/${notificationId}/read`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to mark notification read');
  }
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  if (USE_MOCK) {
    const { markAllNotificationsRead: mockMarkAllRead } = await import('@/mocks/functions/notifications');
    return mockMarkAllRead();
  }

  const res = await fetch(apiUrl('/notifications/read-all'), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to mark all notifications read');
  }
}
