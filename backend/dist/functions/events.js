"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllEvents = getAllEvents;
exports.getEventById = getEventById;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const pg_1 = require("pg");
const events_1 = require("../database/events");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
/**
 * Stuart
 * Retrieves all events from the database, ordered by event date ascending.
 * Returns an array of events, or an empty array if none exist.
 */
async function getAllEvents() {
    // TODO: implement
    throw new Error('Not implemented');
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
 * Creates a new event with the provided details.
 * Returns the newly created event, or null if creation failed.
 */
async function createEvent(input) {
    // TODO: implement
    throw new Error('Not implemented');
}
/**
 * Stuart
 * Updates an existing event identified by eventId with the provided fields.
 * Only the fields present in input will be updated.
 * Returns the updated event if successful, or null if the event was not found.
 */
async function updateEvent(eventId, input) {
    // TODO: implement
    throw new Error('Not implemented');
}
/**
 * Emma
 * Deletes an event by its ID.
 * Returns true if the event was deleted, or false if no event was found with the given ID.
 */
async function deleteEvent(eventId) {
    try {
        const result = await (0, events_1.dbDeleteEvent)(eventId);
        return result;
    }
    catch (error) {
        console.error('Delete event error:', error);
        return false;
    }
}
exports.default = pool;
//# sourceMappingURL=events.js.map