import type { AnnouncementItem } from '@/types/announcements';

export type { AnnouncementItem };

/* Always mock, regardless of NEXT_PUBLIC_USE_MOCK — there's no announcements
   table or backend route yet (unlike events/drive/auth, which are real).
   Wire this up to a real endpoint once an Announcements feature actually
   exists on the backend; until then this would just 404 in "real" mode. */
export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  const { getAnnouncements: mockGetAnnouncements } = await import('@/mocks/functions/announcements');
  return mockGetAnnouncements();
}
