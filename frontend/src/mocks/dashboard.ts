import type { EventItem, TaskItem, AnnouncementItem } from '@/services/dashboard';

/* Dates are stored as ISO strings so the display bits (month chip, "3 days"
   badge, etc.) can be derived instead of going stale in here.

   They're generated relative to today so the mock never rots — hardcoded dates
   would drift into the past and make every task read as DUE. Swap `at()` for
   real ISO strings once this comes from the API. */
function at(daysFromToday: number, time: string): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${time}`;
}

export const mockEvents: EventItem[] = [
  {
    id: 1,
    name: 'Careers Night',
    type: 'INTERNAL',
    startsAt: at(2, '21:30'),
  },
  {
    id: 2,
    name: 'Love Roulette',
    type: 'EXTERNAL',
    startsAt: at(9, '19:30'),
  },
  {
    id: 3,
    name: 'BESS x Engsoc BBQ',
    type: 'EXTERNAL',
    startsAt: at(23, '12:00'),
  },
  {
    id: 4,
    name: 'End of Term Ball',
    type: 'EXTERNAL',
    startsAt: at(40, '18:00'),
  },
];

export const mockTasks: TaskItem[] = [
  {
    id: 1,
    name: 'finish wireframe',
    dueAt: at(0, '21:30'),
    completed: false,
  },
  {
    id: 2,
    name: 'port meeting',
    dueAt: at(3, '21:30'),
    completed: false,
  },
  {
    id: 3,
    name: 'team call',
    dueAt: at(12, '21:30'),
    completed: false,
  },
  {
    id: 4,
    name: 'send sponsor deck',
    dueAt: at(-6, '17:00'),
    completed: true,
  },
  {
    id: 5,
    name: 'book venue',
    dueAt: at(-2, '17:00'),
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
    postedAt: at(-1, '10:00'),
    read: false,
  },
  {
    id: 2,
    posterName: 'Ethan',
    posterRole: 'Socials VP',
    posterAvatar: 'https://placehold.co/64x64',
    description: 'A quick text-only announcement with no attached image.',
    postedAt: at(-3, '09:15'),
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
    postedAt: at(-8, '16:40'),
    read: true,
  },
];
