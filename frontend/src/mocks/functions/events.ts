import type { EventItem } from '@/types/events';
import { mockEvents } from '@/mocks/data/events';

/* A copy, not the live mockEvents array — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getEvents(): Promise<EventItem[]> {
  return mockEvents.slice();
}
