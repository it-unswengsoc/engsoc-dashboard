import type { EventItem } from '@/types/events';
import { mockEvents } from '@/mocks/data/events';

export async function getEvents(): Promise<EventItem[]> {
  return mockEvents;
}
