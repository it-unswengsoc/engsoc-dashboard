import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

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
    const events = await mockGetEvents();
    return {
      connected: true,
      events: events.map((e) => ({
        id: `mock-${e.id}`,
        title: e.name,
        description: null,
        location: null,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        allDay: false,
        calendarName: 'EngSoc',
        isSharedEngSocEvent: e.type === 'INTERNAL',
        htmlLink: null,
      })),
    };
  }

  const res = await fetch(apiUrl('/calendar/events'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load your Google Calendar');
  return { events: data.data as UserCalendarEvent[], connected: data.connected as boolean };
}
