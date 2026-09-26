import type { NotificationItem } from '@/types/notifications';
import { minutesAgo, at } from '@/mocks/data/date-helpers';

export const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    eventId: null,
    taskId: null,
    type: 'announcement',
    title: 'New announcement from Zachary Abran',
    message: 'Careers night sign-ups are open — spread the word!',
    isRead: false,
    createdAt: minutesAgo(12),
  },
  {
    id: 2,
    eventId: null,
    taskId: null,
    type: 'alert',
    title: 'Zachary Abran tagged you in a comment',
    message: 'Thanks for organising this @Winnie Moy!',
    isRead: false,
    createdAt: minutesAgo(40),
  },
  {
    id: 3,
    eventId: null,
    taskId: 2,
    type: 'task',
    title: 'New task assigned: Book the AV room',
    message: 'Due 2 Oct',
    isRead: true,
    createdAt: at(-1, '09:00'),
  },
];
