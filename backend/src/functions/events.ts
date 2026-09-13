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
 * Ethan / Stuart
 * Validates the provided details, then creates a new event and mirrors it
 * to the shared EngSoc Google Calendar. Postgres is the source of truth —
 * the calendar mirror is best-effort and never blocks the event from being
 * created, even if the Google Calendar sync fails.
 *
 * Throws on invalid input (caught by the route handler and surfaced as a
 * 400 with the specific reason). Returns null only if the DB insert or the
 * calendar mirror itself unexpectedly fails, matching the other functions
 * in this file.
 */
export async function createEvent(input: CreateEventInput): Promise<Event | null> {
  const title = input.title?.trim();
  if (!title) {
    throw new Error('Title is required');
  }
  if (title.length > 30) {
    throw new Error('Title must be 30 characters or fewer');
  }
  if (input.description && input.description.length > 300) {
    throw new Error('Description must be 300 characters or fewer');
  }
  if (input.location && input.location.length > 100) {
    throw new Error('Location must be 100 characters or fewer');
  }
  if (input.capacity !== undefined && input.capacity !== null) {
    if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
      throw new Error('Capacity must be a positive integer');
    }
  }
  if (!input.startDate || isNaN(new Date(input.startDate).getTime())) {
    throw new Error('A valid start date is required');
  }
  if (new Date(input.startDate) <= new Date()) {
    throw new Error('Event start date must be in the future');
  }
  if (input.endDate !== undefined) {
    if (isNaN(new Date(input.endDate).getTime())) {
      throw new Error('End date must be a valid date');
    }
    if (new Date(input.endDate) < new Date(input.startDate)) {
      throw new Error('End date must not be before the start date');
    }
  }

  try {
    const event = await dbCreateEvent({ ...input, title });
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
