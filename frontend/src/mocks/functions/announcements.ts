import type { AnnouncementItem } from '@/types/announcements';
import { mockAnnouncements } from '@/mocks/data/announcements';

export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  return mockAnnouncements;
}
