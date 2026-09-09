import type { AnnouncementItem } from '@/types/announcements';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { AnnouncementItem };

export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  if (USE_MOCK) {
    const { getAnnouncements: mockGetAnnouncements } = await import('@/mocks/functions/announcements');
    return mockGetAnnouncements();
  }

  const res = await fetch('/api/announcements');
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load announcements');
  return data.data;
}
