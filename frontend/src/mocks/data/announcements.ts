import type { AnnouncementItem, AnnouncementComment } from '@/types/announcements';
import { at } from '@/mocks/data/date-helpers';

export const mockAnnouncements: AnnouncementItem[] = [
  {
    id: 1,
    authorId: 4,
    authorName: 'Ethan Bian',
    authorRole: 'director',
    content:
      'Love Roulette is our annual dating show hosted by Jenny Tang from Socials. This year EngSoc decided to partner up with BESS to bring us the most entertaining and fun experience yet. Tag @IT if you need help with the sign-up form!',
    imageUrl: 'https://placehold.co/900x500',
    likeCount: 4,
    isLikedByMe: false,
    commentCount: 1,
    createdAt: at(-1, '10:00'),
  },
  {
    id: 2,
    authorId: 4,
    authorName: 'Ethan Bian',
    authorRole: 'director',
    content: 'A quick text-only announcement with no attached image.',
    imageUrl: null,
    likeCount: 0,
    isLikedByMe: false,
    commentCount: 0,
    createdAt: at(-3, '09:15'),
  },
  {
    id: 3,
    authorId: 2,
    authorName: 'Zachary Abran',
    authorRole: 'admin',
    content:
      'Reminder @Ethan Bian: all event graphics need to be submitted to the marketing drive at least two weeks before the event date.',
    imageUrl: 'https://placehold.co/900x500',
    likeCount: 1,
    isLikedByMe: true,
    commentCount: 0,
    createdAt: at(-8, '16:40'),
  },
];

/* Keyed by announcementId. */
export const mockComments: Record<number, AnnouncementComment[]> = {
  1: [
    {
      id: 1,
      announcementId: 1,
      authorId: 2,
      authorName: 'Zachary Abran',
      authorRole: 'admin',
      content: 'Sounds great, @Ethan Bian let me know the graphics deadline.',
      createdAt: at(-1, '11:15'),
    },
  ],
};
