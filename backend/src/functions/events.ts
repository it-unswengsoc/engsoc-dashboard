import { Pool, QueryResult } from 'pg';
import {
  dbGetAllEvents,
  dbGetEventById,
  dbCreateEvent,
  dbUpdateEvent,
  dbDeleteEvent,
  dbSetGoogleCalendarEventId,
} from '../database/events'
import { syncEventCreate, syncEventUpdate, syncEventDelete } from './calendar-sync';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // RDS requires SSL — see functions/auth.ts's pool for why.
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

export type EventType = 'internal' | 'external';

export interface Event {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  eventType: EventType;
  startDate: string;
  endDate: string | null;
  location: string | null;
  organizerId: number | null; // nullable: ON DELETE SET NULL if the organizer's account is removed
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  capacity: number | null;
  googleCalendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  imageUrl?: string;
  eventType?: EventType; // defaults to 'internal' at the DB layer
  startDate: string;
  endDate?: string;
  location?: string;
  organizerId: number;
  capacity?: number;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  eventType?: EventType;
  startDate?: string;
  endDate?: string;
  location?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  capacity?: number;
}

/**
 * Stuart
 * Retrieves all events from the database, ordered by event date ascending.
 * Returns an array of events, or an empty array if none exist.
 */
export async function getAllEvents(): Promise<Event[]> {
  try {
    return await dbGetAllEvents();
  } catch (error) {
    console.error('Get all events error:', error);
    return [];
  }
}

/**
 * Emma
 * Retrieves a single event by its ID.
 * Returns the event if found, or null if no event exists with the given ID.
 */
export async function getEventById(eventId: number): Promise<Event | null> {
  try {
    const event = await dbGetEventById(eventId);
    if (event) {
      return event; 
    }
    return null;
  } catch (error) {
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
export async function createEvent(input: CreateEventInput): Promise<Event | null> {
  try {
    const event = await dbCreateEvent(input);
    if (!event) return null;

    const googleCalendarEventId = await syncEventCreate(event);
    if (googleCalendarEventId) {
      await dbSetGoogleCalendarEventId(event.id, googleCalendarEventId);
      event.googleCalendarEventId = googleCalendarEventId;
    }

    return event;
  } catch (error) {
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
export async function updateEvent(
  eventId: number,
  input: UpdateEventInput
): Promise<Event | null> {
  try {
    const event = await dbUpdateEvent(eventId, input);
    if (!event) return null;

    if (event.googleCalendarEventId) {
      await syncEventUpdate(event);
    } else {
      const googleCalendarEventId = await syncEventCreate(event);
      if (googleCalendarEventId) {
        await dbSetGoogleCalendarEventId(event.id, googleCalendarEventId);
        event.googleCalendarEventId = googleCalendarEventId;
      }
    }

    return event;
  } catch (error) {
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
export async function deleteEvent(eventId: number): Promise<boolean> {
  try {
    const existing = await dbGetEventById(eventId);
    const result = await dbDeleteEvent(eventId);

    if (result && existing?.googleCalendarEventId) {
      await syncEventDelete(existing.googleCalendarEventId);
    }

    return result;
  } catch (error) {
    console.error('Delete event error:', error);
    return false;
  }
}

export default pool;
