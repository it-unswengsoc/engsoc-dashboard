"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserCalendarEvents = getUserCalendarEvents;
const googleapis_1 = require("googleapis");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
function getServiceCalendarClient() {
    const auth = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    auth.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
    return googleapis_1.google.calendar({ version: 'v3', auth });
}
function getUserCalendarClient(refreshToken) {
    const auth = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    auth.setCredentials({ refresh_token: refreshToken });
    return googleapis_1.google.calendar({ version: 'v3', auth });
}
/* GOOGLE_CALENDAR_ID is an alias ('primary') from the service account's own
   point of view — resolving it once to its real, stable ID lets us recognise
   the same calendar inside a *different* account's calendarList (Google
   calendar IDs are the same for everyone who has access to that calendar).
   Cached for the life of the process; this calendar's identity never
   changes at runtime. */
let sharedCalendarIdPromise = null;
function resolveSharedCalendarId() {
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
function toUserCalendarEvent(event, cal, sharedCalendarId) {
    return {
        id: event.id,
        title: event.summary || '(untitled event)',
        description: event.description ?? null,
        location: event.location ?? null,
        startsAt: (event.start?.dateTime || event.start?.date),
        endsAt: event.end?.dateTime || event.end?.date || null,
        allDay: !!event.start?.date,
        calendarName: cal.summaryOverride || cal.summary || 'Calendar',
        isSharedEngSocEvent: !!sharedCalendarId && cal.id === sharedCalendarId,
        htmlLink: event.htmlLink ?? null,
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
async function getUserCalendarEvents(refreshToken, timeMin, timeMax) {
    const calendar = getUserCalendarClient(refreshToken);
    const sharedCalendarId = await resolveSharedCalendarId();
    const calendarList = await calendar.calendarList.list();
    // `selected === false` is a calendar the member has explicitly hidden in
    // their own Google Calendar UI — respecting that keeps this view matching
    // what they'd actually see there.
    const calendars = (calendarList.data.items ?? []).filter((cal) => cal.id && cal.selected !== false);
    const perCalendar = await Promise.all(calendars.map(async (cal) => {
        try {
            const eventsRes = await calendar.events.list({
                calendarId: cal.id,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 250,
            });
            return (eventsRes.data.items ?? [])
                .filter((event) => event.status !== 'cancelled' && (event.start?.dateTime || event.start?.date))
                .map((event) => toUserCalendarEvent(event, cal, sharedCalendarId));
        }
        catch (error) {
            // A calendar the member can no longer actually read (revoked share,
            // deleted calendar, ...) shouldn't take down the whole request.
            console.error(`Failed to list events for calendar ${cal.id}:`, error);
            return [];
        }
    }));
    return perCalendar.flat().sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
//# sourceMappingURL=user-calendar.js.map