import type { AnnouncementItem } from '@/types/announcements';
import { at } from '@/mocks/data/date-helpers';

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
