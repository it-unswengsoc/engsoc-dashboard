import type { NotificationItem } from '@/types/notifications';
import { mockNotifications } from '@/mocks/data/notifications';

/* A copy, not the live mockNotifications array — see
   mocks/functions/announcements.ts's getAnnouncements for why: the bell
   polls this into React state and compares by reference to decide whether
   to re-render. */
export async function getNotifications(): Promise<NotificationItem[]> {
  return mockNotifications.slice();
}

/* Mutates mockNotifications directly (module-level, in-memory) so the bell
   reflects a read/read-all immediately in local dev — resets on reload,
   same as every other in-memory mock in this app. */
export async function markNotificationRead(notificationId: number): Promise<void> {
  const notification = mockNotifications.find((n) => n.id === notificationId);
  if (notification) notification.isRead = true;
}

export async function markAllNotificationsRead(): Promise<void> {
  mockNotifications.forEach((n) => (n.isRead = true));
}
