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
  organizerId: number | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
}

function toEventItem(raw: RawEvent): EventItem {
  return {
    id: raw.id,
    name: raw.title,
    type: raw.eventType.toUpperCase() as EventType,
    startsAt: raw.startDate,
    endsAt: raw.endDate,
    organizerId: raw.organizerId,
    location: raw.location,
    description: raw.description,
    capacity: raw.capacity,
    facebookUrl: raw.facebookUrl,
    instagramUrl: raw.instagramUrl,
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

/* Official events don't carry every field (e.g. capacity) into their
   Google Calendar mirror, so editing a shared event fetches the real
   Postgres row rather than trusting what the calendar view derived from
   Google. Postgres is the source of truth for anything official. */
export async function getEventById(eventId: number): Promise<EventItem> {
  if (USE_MOCK) {
    const { getEvents: mockGetEvents } = await import('@/mocks/functions/events');
    const events = await mockGetEvents();
    const event = events.find((e) => e.id === eventId);
    if (!event) throw new Error('Event not found');
    return event;
  }

  const res = await fetch(apiUrl(`/events/${eventId}`), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load event');
  return toEventItem(data.data as RawEvent);
}

export interface CreateEventInput {
  title: string;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  eventType: 'internal' | 'external';
  location?: string;
  capacity?: number;
  description?: string;
  facebookUrl?: string;
  instagramUrl?: string;
}

export type UpdateEventInput = Partial<CreateEventInput>;

/* Director/executive/admin only — the backend enforces this (403s
   otherwise); the frontend only offers event creation when it already knows
   that's true (see EventComposer). The backend mirrors the created event to
   the shared Google Calendar itself (see calendar-sync.ts) — nothing more to
   do here once this resolves. */
export async function createEvent(token: string, input: CreateEventInput): Promise<EventItem> {
  if (USE_MOCK) {
    const { createEvent: mockCreateEvent } = await import('@/mocks/functions/events');
    return mockCreateEvent(input);
  }

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

/* Organizer or admin only — the backend enforces this (403s otherwise); the
   frontend only offers Edit when it already knows that's true. */
export async function updateEvent(token: string, eventId: number, input: UpdateEventInput): Promise<EventItem> {
  if (USE_MOCK) {
    const { updateEvent: mockUpdateEvent } = await import('@/mocks/functions/events');
    return mockUpdateEvent(eventId, input);
  }

  const res = await fetch(apiUrl(`/events/${eventId}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update event');
  return toEventItem(data.data as RawEvent);
}

/* Organizer or admin only — the backend enforces this (403s otherwise); the
   frontend only offers Delete when it already knows that's true. */
export async function deleteEvent(token: string, eventId: number): Promise<void> {
  if (USE_MOCK) {
    const { deleteEvent: mockDeleteEvent } = await import('@/mocks/functions/events');
    return mockDeleteEvent(eventId);
  }

  const res = await fetch(apiUrl(`/events/${eventId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete event');
  }
}

export type RsvpStatus = 'going' | 'not_going';

export interface RsvpEntry {
  userId: number;
  name: string;
  status: RsvpStatus;
}

export interface RsvpSummary {
  going: RsvpEntry[];
  notGoing: RsvpEntry[];
  myStatus: RsvpStatus | null;
}

/* Any member can RSVP to any event — there's no invite list (see the
   comment on the events table). */
export async function getRsvpSummary(token: string, eventId: number): Promise<RsvpSummary> {
  if (USE_MOCK) {
    const { getRsvpSummary: mockGetRsvpSummary } = await import('@/mocks/functions/events');
    return mockGetRsvpSummary(eventId);
  }

  const res = await fetch(apiUrl(`/events/${eventId}/rsvp`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load RSVPs');
  return data.data as RsvpSummary;
}

export async function setRsvp(token: string, eventId: number, status: RsvpStatus): Promise<RsvpSummary> {
  if (USE_MOCK) {
    const { setRsvp: mockSetRsvp } = await import('@/mocks/functions/events');
    return mockSetRsvp(eventId, status);
  }

  const res = await fetch(apiUrl(`/events/${eventId}/rsvp`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update RSVP');
  return data.data as RsvpSummary;
}
