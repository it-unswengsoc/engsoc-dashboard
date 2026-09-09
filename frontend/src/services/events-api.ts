import type { EventType, EventItem } from '@/types/events';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { EventType, EventItem };

export async function getEvents(): Promise<EventItem[]> {
  if (USE_MOCK) {
    const { getEvents: mockGetEvents } = await import('@/mocks/functions/events');
    return mockGetEvents();
  }

  const res = await fetch(apiUrl('/events'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load events');
  return data.data;
}
