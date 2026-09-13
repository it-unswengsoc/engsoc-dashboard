import type { EventType, EventItem } from '@/types/events';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { EventType, EventItem };

/* Shape the backend actually returns (backend/src/functions/events.ts's
   Event interface) — snake_case columns already camelCased by the backend,
   but field names/casing still differ from the frontend's own EventItem
   (kept stable on purpose so the calendar UI didn't need to change names
   too). Mapped below rather than renaming EventItem everywhere. */
interface RawEvent {
  id: number;
  title: string;
  eventType: 'internal' | 'external';
  startDate: string;
  endDate: string | null;
}

function toEventItem(raw: RawEvent): EventItem {
  return {
    id: raw.id,
    name: raw.title,
    type: raw.eventType.toUpperCase() as EventType,
    startsAt: raw.startDate,
    endsAt: raw.endDate,
  };
}

export async function getEvents(): Promise<EventItem[]> {
  if (USE_MOCK) {
    const { getEvents: mockGetEvents } = await import('@/mocks/functions/events');
    return mockGetEvents();
  }

  const res = await fetch(apiUrl('/events'), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load events');
  return (data.data as RawEvent[]).map(toEventItem);
}

export interface CreateEventInput {
  title: string;
  startDate: string; // ISO date string
  eventType: 'internal' | 'external';
  location?: string;
  capacity?: number;
  description?: string;
}

/* Called client-side from the "New event" dialog, so the token comes from
   the signed-in member's own session rather than being read here. The
   backend mirrors the created event to the shared Google Calendar itself
   (see backend/src/functions/calendar-sync.ts) — nothing more to do here
   once this resolves. */
export async function createEvent(token: string, input: CreateEventInput): Promise<EventItem> {
  const res = await fetch(apiUrl('/events'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create event');
  return toEventItem(data.data as RawEvent);
}
