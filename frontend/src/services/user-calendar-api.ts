import { USE_MOCK } from '@/services/api-config';
import { api, apiFetch } from '@/services/api-client';

export interface UserCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string; // ISO — a date-only string for all-day events
  endsAt: string | null;
  allDay: boolean;
  calendarName: string;
  isSharedEngSocEvent: boolean;
  htmlLink: string | null;
  // True when the member can write to this event's calendar directly (their
  // own primary calendar) — false for the shared EngSoc calendar (edited
  // through /events instead) and for anything else they can only view.
  canEdit: boolean;
  // For a shared EngSoc event, the Postgres events.id it came from — lets an
  // edit route to the official PUT /events/:id flow instead of a personal
  // Google Calendar write. Null for personal events.
  officialEventId: number | null;
}

export interface UserCalendarResult {
  events: UserCalendarEvent[];
  // False if this account has no Google refresh token stored yet — a
  // password-only account, or a Google account that hasn't signed in since
  // this feature shipped. The calendar page prompts a re-login in that case.
  connected: boolean;
}

/* Client-side only: the calendar page needs the signed-in member's own JWT
   to know whose Google Calendar to read, which a Server Component can't
   reach (the token lives in sessionStorage). */
export async function getMyCalendarEvents(token: string): Promise<UserCalendarResult> {
  if (USE_MOCK) {
    const { getEvents: mockGetEvents } = await import('@/mocks/functions/events');
    const { getPersonalEvents: mockGetPersonalEvents } = await import('@/mocks/functions/user-calendar');
    const [events, personalEvents] = await Promise.all([mockGetEvents(), mockGetPersonalEvents()]);
    return {
      connected: true,
      events: [
        ...events.map((e) => ({
          id: `mock-${e.id}`,
          title: e.name,
          description: e.description,
          location: e.location,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          allDay: false,
          calendarName: 'EngSoc',
          isSharedEngSocEvent: e.type === 'INTERNAL',
          htmlLink: null,
          canEdit: false,
          officialEventId: e.id,
        })),
        ...personalEvents,
      ],
    };
  }

  const data = await apiFetch('/calendar/events', { token, errorMessage: 'Failed to load your Google Calendar' });
  return { events: data.data as UserCalendarEvent[], connected: data.connected as boolean };
}

export interface PersonalEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
}

/* Writes a personal event directly onto the signed-in member's own Google
   Calendar — not Postgres, not shared with anyone else. See
   backend/src/routes/calendar.ts's POST/PUT/DELETE /calendar/events. */
export async function createMyCalendarEvent(token: string, input: PersonalEventInput): Promise<UserCalendarEvent> {
  if (USE_MOCK) {
    const { createPersonalEvent } = await import('@/mocks/functions/user-calendar');
    return createPersonalEvent(input);
  }

  return api<UserCalendarEvent>('/calendar/events', {
    method: 'POST',
    token,
    body: input,
    errorMessage: 'Failed to create event',
  });
}

export async function updateMyCalendarEvent(
  token: string,
  googleEventId: string,
  input: Partial<PersonalEventInput>,
): Promise<UserCalendarEvent> {
  if (USE_MOCK) {
    const { updatePersonalEvent } = await import('@/mocks/functions/user-calendar');
    return updatePersonalEvent(googleEventId, input);
  }

  return api<UserCalendarEvent>(`/calendar/events/${encodeURIComponent(googleEventId)}`, {
    method: 'PUT',
    token,
    body: input,
    errorMessage: 'Failed to update event',
  });
}

export async function deleteMyCalendarEvent(token: string, googleEventId: string): Promise<void> {
  if (USE_MOCK) {
    const { deletePersonalEvent } = await import('@/mocks/functions/user-calendar');
    return deletePersonalEvent(googleEventId);
  }

  await apiFetch(`/calendar/events/${encodeURIComponent(googleEventId)}`, {
    method: 'DELETE',
    token,
    errorMessage: 'Failed to delete event',
  });
}
