"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbGetAllEvents = dbGetAllEvents;
exports.dbGetEventById = dbGetEventById;
exports.dbCreateEvent = dbCreateEvent;
exports.dbUpdateEvent = dbUpdateEvent;
exports.dbDeleteEvent = dbDeleteEvent;
exports.dbSetGoogleCalendarEventId = dbSetGoogleCalendarEventId;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    // RDS requires SSL — see functions/auth.ts's pool for why.
    ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});
const EVENT_COLUMNS = `id, title, description, image_url, event_type, start_date, end_date,
       location, organizer_id, status, capacity, google_calendar_event_id, created_at, updated_at`;
/**
 * Maps a raw database row to the Event interface,
 * converting snake_case column names to camelCase.
 */
function rowToEvent(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        eventType: row.event_type,
        startDate: row.start_date,
        endDate: row.end_date,
        location: row.location,
        organizerId: row.organizer_id,
        status: row.status,
        capacity: row.capacity,
        googleCalendarEventId: row.google_calendar_event_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/**
 * Fetches every event from the database, ordered by start date ascending.
 * Returns an array of Event objects (empty array if no events exist).
 */
async function dbGetAllEvents() {
    const result = await pool.query(`SELECT ${EVENT_COLUMNS} FROM events ORDER BY start_date ASC`);
    return result.rows.map(rowToEvent);
}
/**
 * Fetches a single event by its ID.
 * Returns the Event if found, or null if no row matches.
 */
async function dbGetEventById(eventId) {
    const result = await pool.query(`SELECT ${EVENT_COLUMNS} FROM events WHERE id = $1`, [eventId]);
    if (result.rows.length === 0)
        return null;
    return rowToEvent(result.rows[0]);
}
/**
 * Inserts a new event row and returns the created Event.
 * Returns null if the insert did not produce a row.
 */
async function dbCreateEvent(input) {
    const result = await pool.query(`INSERT INTO events
       (title, description, image_url, event_type, start_date, end_date, location, organizer_id, capacity, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING ${EVENT_COLUMNS}`, [
        input.title,
        input.description ?? null,
        input.imageUrl ?? null,
        input.eventType ?? 'internal',
        input.startDate,
        input.endDate ?? null,
        input.location ?? null,
        input.organizerId,
        input.capacity ?? null,
    ]);
    if (result.rows.length === 0)
        return null;
    return rowToEvent(result.rows[0]);
}
/**
 * Updates only the fields present in `input` on the given event.
 * Leaves unspecified fields unchanged.
 * Returns the updated Event, or null if no event with that ID exists.
 */
async function dbUpdateEvent(eventId, input) {
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    if (input.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(input.title);
    }
    if (input.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(input.description);
    }
    if (input.imageUrl !== undefined) {
        setClauses.push(`image_url = $${paramIndex++}`);
        values.push(input.imageUrl);
    }
    if (input.eventType !== undefined) {
        setClauses.push(`event_type = $${paramIndex++}`);
        values.push(input.eventType);
    }
    if (input.startDate !== undefined) {
        setClauses.push(`start_date = $${paramIndex++}`);
        values.push(input.startDate);
    }
    if (input.endDate !== undefined) {
        setClauses.push(`end_date = $${paramIndex++}`);
        values.push(input.endDate);
    }
    if (input.location !== undefined) {
        setClauses.push(`location = $${paramIndex++}`);
        values.push(input.location);
    }
    if (input.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(input.status);
    }
    if (input.capacity !== undefined) {
        setClauses.push(`capacity = $${paramIndex++}`);
        values.push(input.capacity);
    }
    if (setClauses.length === 0) {
        // Nothing to update — just return the existing event
        return dbGetEventById(eventId);
    }
    setClauses.push(`updated_at = NOW()`);
    values.push(eventId);
    const result = await pool.query(`UPDATE events
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING ${EVENT_COLUMNS}`, values);
    if (result.rows.length === 0)
        return null;
    return rowToEvent(result.rows[0]);
}
/**
 * Deletes the event with the given ID.
 * Returns true if a row was deleted, false if no event with that ID existed.
 */
async function dbDeleteEvent(eventId) {
    const result = await pool.query(`DELETE FROM events WHERE id = $1 RETURNING id`, [eventId]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Records which Google Calendar event a row was mirrored to. Kept separate
 * from dbUpdateEvent so this can't be set through the public update API —
 * only the calendar-sync flow in functions/events.ts writes it.
 */
async function dbSetGoogleCalendarEventId(eventId, googleCalendarEventId) {
    await pool.query(`UPDATE events SET google_calendar_event_id = $1 WHERE id = $2`, [
        googleCalendarEventId,
        eventId,
    ]);
}
//# sourceMappingURL=events.js.map