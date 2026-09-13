import { google, calendar_v3 } from 'googleapis';
import { Event } from './events';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

/* The shared EngSoc calendar events get mirrored to. Defaults to the
   connected service account's own primary calendar — set this to a specific
   calendar's ID (its email-style address, from that calendar's Settings page)
   if events should land somewhere other than that account's primary. Members
   who add this calendar to their own Google account then see every mirrored
   event alongside their personal one automatically — no per-user OAuth
   needed on our end. */
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

/* Reuses the same service-level refresh token as Drive (functions/drive.ts)
   — it already carries the calendar scope (see functions/google.ts). */
function getCalendarClient(): calendar_v3.Calendar {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  auth.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

/* Google Calendar has no "no end time" concept for a timed event — falls
   back to a 1-hour block, matching the calendar grid's own default. */
function toGoogleEvent(event: Event): calendar_v3.Schema$Event {
  const endDate = event.endDate ?? new Date(new Date(event.startDate).getTime() + 60 * 60 * 1000).toISOString();

  return {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    start: { dateTime: event.startDate },
    end: { dateTime: endDate },
  };
}

/**
 * Mirrors a newly created Postgres event into the shared Google Calendar.
 * Postgres stays the source of truth: a sync failure (revoked consent,
 * network blip, ...) is logged and swallowed, never thrown — it must not
 * block or roll back the row that already exists.
 */
export async function syncEventCreate(event: Event): Promise<string | null> {
  try {
    const calendar = getCalendarClient();
    const res = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: toGoogleEvent(event),
    });
    return res.data.id ?? null;
  } catch (error) {
    console.error('Google Calendar sync (create) failed:', error);
    return null;
  }
}

/**
 * Pushes an edited event's fields to its mirrored Google Calendar entry.
 * No-op if the event was never successfully mirrored in the first place —
 * callers should fall back to syncEventCreate in that case.
 */
export async function syncEventUpdate(event: Event): Promise<void> {
  if (!event.googleCalendarEventId) return;

  try {
    const calendar = getCalendarClient();
    await calendar.events.update({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: event.googleCalendarEventId,
      requestBody: toGoogleEvent(event),
    });
  } catch (error) {
    console.error('Google Calendar sync (update) failed:', error);
  }
}

/**
 * Removes an event's mirrored Google Calendar entry after it's deleted from
 * Postgres. No-op if it was never mirrored.
 */
export async function syncEventDelete(googleCalendarEventId: string | null): Promise<void> {
  if (!googleCalendarEventId) return;

  try {
    const calendar = getCalendarClient();
    await calendar.events.delete({
      calendarId: GOOGLE_CALENDAR_ID,
      eventId: googleCalendarEventId,
    });
  } catch (error) {
    console.error('Google Calendar sync (delete) failed:', error);
  }
}
