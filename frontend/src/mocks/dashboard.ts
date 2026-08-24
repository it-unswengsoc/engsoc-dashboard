import type { EventItem, TaskItem, AnnouncementItem } from '@/services/dashboard';

/* Dates are stored as ISO strings so the display bits (month chip, "3 days"
   badge, etc.) can be derived instead of going stale in here. */

export const mockEvents: EventItem[] = [
  {
    id: 1,
    name: 'Careers Night',
    type: 'INTERNAL',
    startsAt: '2026-07-05T21:30:00',
  },
  {
    id: 2,
    name: 'Love Roulette',
    type: 'EXTERNAL',
    startsAt: '2026-08-21T19:30:00',
  },
  {
    id: 3,
    name: 'BESS x Engsoc BBQ',
    type: 'EXTERNAL',
    startsAt: '2026-08-28T12:00:00',
  },
  {
    id: 4,
    name: 'End of Term Ball',
    type: 'EXTERNAL',
    startsAt: '2026-09-12T18:00:00',
  },
];

export const mockTasks: TaskItem[] = [
  {
    id: 1,
    name: 'finish wireframe',
    dueAt: '2026-06-01T21:30:00',
    completed: false,
  },
  {
    id: 2,
    name: 'port meeting',
    dueAt: '2026-06-04T21:30:00',
    completed: false,
  },
  {
    id: 3,
    name: 'team call',
    dueAt: '2026-06-08T21:30:00',
    completed: false,
  },
  {
    id: 4,
    name: 'send sponsor deck',
    dueAt: '2026-06-15T17:00:00',
    completed: true,
  },
  {
    id: 5,
    name: 'book venue',
    dueAt: '2026-06-20T17:00:00',
    completed: true,
  },
];

export const mockAnnouncements: AnnouncementItem[] = [
  {
    id: 1,
    posterName: 'Ethan',
    posterRole: 'Socials VP',
    posterAvatar: 'https://placehold.co/64x64',
    image: 'https://placehold.co/900x500',
    description:
      'Love Roulette is our annual dating show hosted by Jenny Tang from Socials. This year Engsoc. Decided to partner up with BESS to bring us the most entertaining and fun experience yet.',
    postedAt: '2026-08-20T10:00:00',
    read: false,
  },
  {
    id: 2,
    posterName: 'Ethan',
    posterRole: 'Socials VP',
    posterAvatar: 'https://placehold.co/64x64',
    description: 'A quick text-only announcement with no attached image.',
    postedAt: '2026-08-18T09:15:00',
    read: false,
  },
  {
    id: 3,
    posterName: 'Jenny',
    posterRole: 'Marketing Director',
    posterAvatar: 'https://placehold.co/64x64',
    image: 'https://placehold.co/900x500',
    description:
      'Reminder: all event graphics need to be submitted to the marketing drive at least two weeks before the event date.',
    postedAt: '2026-08-14T16:40:00',
    read: true,
  },
];
