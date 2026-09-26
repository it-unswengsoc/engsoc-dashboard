import { google, calendar_v3 } from 'googleapis';
import { dbGetEventIdsByGoogleCalendarEventIds } from '../database/events';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export interface UserCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string; // ISO — a date-only string ("2026-10-01") for all-day events
  endsAt: string | null;
  allDay: boolean;
  calendarName: string;
  // True if this event lives on the shared EngSoc calendar (see
  // functions/calendar-sync.ts) rather than one of the member's own —
  // lets the dashboard tell "official" events apart from personal ones.
  isSharedEngSocEvent: boolean;
  htmlLink: string | null;
  // True when the member owns (or can write to) the calendar this event
  // lives on, AND it isn't the shared EngSoc calendar — shared events are
  // only ever editable through the official Postgres-backed /events flow,
  // to keep Postgres as the source of truth for anything official.
  canEdit: boolean;
  // For a shared EngSoc event, the Postgres events.id it was mirrored from
  // (resolved via events.google_calendar_event_id) — lets the frontend route
  // an edit on a shared item to PUT /events/:id instead of a personal write.
  // Null for personal events, or if the lookup didn't find a match.
  officialEventId: number | null;
}

export interface CreateUserCalendarEventInput {
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string; // ISO datetime, or a date-only string ("2026-10-01") when allDay
  endsAt: string; // same shape as startsAt
  allDay: boolean;
}

export type UpdateUserCalendarEventInput = Partial<CreateUserCalendarEventInput>;

function getServiceCalendarClient(): calendar_v3.Calendar {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  auth.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

function getUserCalendarClient(refreshToken: string): calendar_v3.Calendar {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth });
}

/* GOOGLE_CALENDAR_ID is an alias ('primary') from the service account's own
   point of view — resolving it once to its real, stable ID lets us recognise
   the same calendar inside a *different* account's calendarList (Google
   calendar IDs are the same for everyone who has access to that calendar).
   Cached for the life of the process; this calendar's identity never
   changes at runtime. */
let sharedCalendarIdPromise: Promise<string | null> | null = null;

function resolveSharedCalendarId(): Promise<string | null> {
  if (!sharedCalendarIdPromise) {
    sharedCalendarIdPromise = getServiceCalendarClient()
      .calendars.get({ calendarId: GOOGLE_CALENDAR_ID })
      .then((res) => res.data.id ?? null)
      .catch((error) => {
        console.error('Failed to resolve shared EngSoc calendar id:', error);
        return null;
      });
  }
  return sharedCalendarIdPromise;
}

function toUserCalendarEvent(
  event: calendar_v3.Schema$Event,
  cal: calendar_v3.Schema$CalendarListEntry,
  sharedCalendarId: string | null
): UserCalendarEvent {
  const isSharedEngSocEvent = !!sharedCalendarId && cal.id === sharedCalendarId;
  return {
    id: event.id!,
    title: event.summary || '(untitled event)',
    description: event.description ?? null,
    location: event.location ?? null,
    startsAt: (event.start?.dateTime || event.start?.date)!,
    endsAt: event.end?.dateTime || event.end?.date || null,
    allDay: !!event.start?.date,
    calendarName: cal.summaryOverride || cal.summary || 'Calendar',
    isSharedEngSocEvent,
    htmlLink: event.htmlLink ?? null,
    canEdit: !isSharedEngSocEvent && (cal.accessRole === 'owner' || cal.accessRole === 'writer'),
    officialEventId: null, // filled in by getUserCalendarEvents once every shared event's id is known
  };
}

/**
 * Lists events across every calendar the signed-in member can currently see
 * in their own Google account — their personal calendar, plus anything
 * they've added (including the shared EngSoc calendar, once they've
 * subscribed to it themselves; there's no way to add it on their behalf
 * from here). Deliberately mirrors "whatever they can see in Google
 * Calendar" rather than re-deriving it from Postgres.
 *
 * Only the first page of each calendar's events is fetched (a calendar with
 * a huge number of events in the window won't paginate) — acceptable for a
 * club calendar, not for someone importing years of dense personal history.
 */
export async function getUserCalendarEvents(
  refreshToken: string,
  timeMin: string,
  timeMax: string
): Promise<UserCalendarEvent[]> {
  const calendar = getUserCalendarClient(refreshToken);
  const sharedCalendarId = await resolveSharedCalendarId();

  const calendarList = await calendar.calendarList.list();
  // `selected === false` is a calendar the member has explicitly hidden in
  // their own Google Calendar UI — respecting that keeps this view matching
  // what they'd actually see there.
  const calendars = (calendarList.data.items ?? []).filter((cal) => cal.id && cal.selected !== false);

  const perCalendar = await Promise.all(
    calendars.map(async (cal) => {
      try {
        const eventsRes = await calendar.events.list({
          calendarId: cal.id!,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        });

        return (eventsRes.data.items ?? [])
          .filter((event) => event.status !== 'cancelled' && (event.start?.dateTime || event.start?.date))
          .map((event) => toUserCalendarEvent(event, cal, sharedCalendarId));
      } catch (error) {
        // A calendar the member can no longer actually read (revoked share,
        // deleted calendar, ...) shouldn't take down the whole request.
        console.error(`Failed to list events for calendar ${cal.id}:`, error);
        return [];
      }
    })
  );

  const events = perCalendar.flat();

  const sharedEventIds = events.filter((e) => e.isSharedEngSocEvent).map((e) => e.id);
  const officialIdByGoogleId = await dbGetEventIdsByGoogleCalendarEventIds(sharedEventIds);
  for (const event of events) {
    if (event.isSharedEngSocEvent) {
      event.officialEventId = officialIdByGoogleId.get(event.id) ?? null;
    }
  }

  return events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

function toGoogleEventBody(input: CreateUserCalendarEventInput | UpdateUserCalendarEventInput): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = {};
  if (input.title !== undefined) body.summary = input.title;
  if (input.description !== undefined) body.description = input.description ?? undefined;
  if (input.location !== undefined) body.location = input.location ?? undefined;
  if (input.startsAt !== undefined) {
    body.start = input.allDay ? { date: input.startsAt } : { dateTime: input.startsAt };
  }
  if (input.endsAt !== undefined) {
    body.end = input.allDay ? { date: input.endsAt } : { dateTime: input.endsAt };
  }
  return body;
}

/**
 * Creates a new event directly on the signed-in member's own primary Google
 * Calendar, using their own stored refresh token — the scope requested at
 * login (`https://www.googleapis.com/auth/calendar`) already covers this, no
 * new consent needed. This is for personal events only; official EngSoc
 * events stay Postgres-backed (see functions/events.ts + calendar-sync.ts).
 */
export async function createUserCalendarEvent(
  refreshToken: string,
  input: CreateUserCalendarEventInput
): Promise<UserCalendarEvent> {
  const calendar = getUserCalendarClient(refreshToken);
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: toGoogleEventBody(input),
  });
  return toUserCalendarEvent(res.data, { id: 'primary', summary: 'primary', accessRole: 'owner' }, null);
}

export async function updateUserCalendarEvent(
  refreshToken: string,
  googleEventId: string,
  input: UpdateUserCalendarEventInput
): Promise<UserCalendarEvent> {
  const calendar = getUserCalendarClient(refreshToken);
  // .patch (not .update) — .update replaces the whole event resource, which
  // would blank out any field this partial input doesn't include.
  const res = await calendar.events.patch({
    calendarId: 'primary',
    eventId: googleEventId,
    requestBody: toGoogleEventBody(input),
  });
  return toUserCalendarEvent(res.data, { id: 'primary', summary: 'primary', accessRole: 'owner' }, null);
}

export async function deleteUserCalendarEvent(refreshToken: string, googleEventId: string): Promise<void> {
  const calendar = getUserCalendarClient(refreshToken);
  await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId });
}
