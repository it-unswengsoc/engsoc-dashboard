"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllEvents = getAllEvents;
exports.getEventById = getEventById;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const pg_1 = require("pg");
const events_1 = require("../database/events");
const calendar_sync_1 = require("./calendar-sync");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    // RDS requires SSL — see functions/auth.ts's pool for why.
    ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});
/**
 * Stuart
 * Retrieves all events from the database, ordered by event date ascending.
 * Returns an array of events, or an empty array if none exist.
 */
async function getAllEvents() {
    try {
        return await (0, events_1.dbGetAllEvents)();
    }
    catch (error) {
        console.error('Get all events error:', error);
        return [];
    }
}
/**
 * Emma
 * Retrieves a single event by its ID.
 * Returns the event if found, or null if no event exists with the given ID.
 */
async function getEventById(eventId) {
    try {
        const event = await (0, events_1.dbGetEventById)(eventId);
        if (event) {
            return event;
        }
        return null;
    }
    catch (error) {
        console.error('Get event error:', error);
        return null;
    }
}
/**
 * Ethan
 * Creates a new event with the provided details, then mirrors it to the
 * shared EngSoc Google Calendar. Postgres is the source of truth — the
 * calendar mirror is best-effort and never blocks the event from being
 * created, even if the Google Calendar sync fails.
 * Returns the newly created event, or null if creation failed.
 */
async function createEvent(input) {
    try {
        const event = await (0, events_1.dbCreateEvent)(input);
        if (!event)
            return null;
        const googleCalendarEventId = await (0, calendar_sync_1.syncEventCreate)(event);
        if (googleCalendarEventId) {
            await (0, events_1.dbSetGoogleCalendarEventId)(event.id, googleCalendarEventId);
            event.googleCalendarEventId = googleCalendarEventId;
        }
        return event;
    }
    catch (error) {
        console.error('Create event error:', error);
        return null;
    }
}
/**
 * Stuart
 * Updates an existing event identified by eventId with the provided fields,
 * then pushes the change to its mirrored Google Calendar entry (or creates
 * one now if this event predates the calendar-sync feature and was never
 * mirrored). Only the fields present in input will be updated.
 * Returns the updated event if successful, or null if the event was not found.
 */
async function updateEvent(eventId, input) {
    try {
        const event = await (0, events_1.dbUpdateEvent)(eventId, input);
        if (!event)
            return null;
        if (event.googleCalendarEventId) {
            await (0, calendar_sync_1.syncEventUpdate)(event);
        }
        else {
            const googleCalendarEventId = await (0, calendar_sync_1.syncEventCreate)(event);
            if (googleCalendarEventId) {
                await (0, events_1.dbSetGoogleCalendarEventId)(event.id, googleCalendarEventId);
                event.googleCalendarEventId = googleCalendarEventId;
            }
        }
        return event;
    }
    catch (error) {
        console.error('Update event error:', error);
        return null;
    }
}
/**
 * Emma
 * Deletes an event by its ID, then removes its mirrored Google Calendar
 * entry (if it had one).
 * Returns true if the event was deleted, or false if no event was found with the given ID.
 */
async function deleteEvent(eventId) {
    try {
        const existing = await (0, events_1.dbGetEventById)(eventId);
        const result = await (0, events_1.dbDeleteEvent)(eventId);
        if (result && existing?.googleCalendarEventId) {
            await (0, calendar_sync_1.syncEventDelete)(existing.googleCalendarEventId);
        }
        return result;
    }
    catch (error) {
        console.error('Delete event error:', error);
        return false;
    }
}
exports.default = pool;
//# sourceMappingURL=events.js.map