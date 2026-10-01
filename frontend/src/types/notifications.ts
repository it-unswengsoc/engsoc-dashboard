export type NotificationType = 'event' | 'alert' | 'announcement' | 'task' | 'request';

export interface NotificationItem {
  id: number;
  eventId: number | null;
  taskId: number | null;
  requestId: number | null;
  type: NotificationType;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string; // ISO date string
}
