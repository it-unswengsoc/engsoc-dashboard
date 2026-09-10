"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbGetAllEvents = dbGetAllEvents;
exports.dbGetEventById = dbGetEventById;
exports.dbCreateEvent = dbCreateEvent;
exports.dbUpdateEvent = dbUpdateEvent;
exports.dbDeleteEvent = dbDeleteEvent;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
/**
 * Maps a raw database row to the Event interface,
 * converting snake_case column names to camelCase.
 */
function rowToEvent(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        eventDate: row.event_date,
        location: row.location,
        organizerId: row.organizer_id,
        status: row.status,
        capacity: row.capacity,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
/**
 * Fetches every event from the database, ordered by event date ascending.
 * Returns an array of Event objects (empty array if no events exist).
 */
async function dbGetAllEvents() {
    const result = await pool.query(`SELECT id, title, description, event_date, location, organizer_id,
            status, capacity, created_at, updated_at
     FROM events
     ORDER BY event_date ASC`);
    return result.rows.map(rowToEvent);
}
/**
 * Fetches a single event by its ID.
 * Returns the Event if found, or null if no row matches.
 */
async function dbGetEventById(eventId) {
    const result = await pool.query(`SELECT id, title, description, event_date, location, organizer_id,
            status, capacity, created_at, updated_at
     FROM events
     WHERE id = $1`, [eventId]);
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
       (title, description, event_date, location, organizer_id, capacity, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING id, title, description, event_date, location, organizer_id,
               status, capacity, created_at, updated_at`, [
        input.title,
        input.description ?? null,
        input.eventDate,
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
    if (input.eventDate !== undefined) {
        setClauses.push(`event_date = $${paramIndex++}`);
        values.push(input.eventDate);
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
     RETURNING id, title, description, event_date, location, organizer_id,
               status, capacity, created_at, updated_at`, values);
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
//# sourceMappingURL=events.js.map