import { Pool, QueryResult } from 'pg';
import { dbGetEventById, dbDeleteEvent, dbCreateEvent } from '../database/events'
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Event {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  location: string | null;
  organizerId: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  eventDate: string;
  location?: string;
  organizerId: number;
  capacity?: number;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  eventDate?: string;
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
  // TODO: implement
  throw new Error('Not implemented');
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
 * Creates a new event with the provided details.
 * Returns the newly created event id , or null if creation failed.
 */
export async function createEvent(input: CreateEventInput): Promise<Event | null> {
  // TODO: implement
  try {
    const title = input.title?.trim();
    if (!title) {
      throw new Error('Title is required');
    }
    if (title.length > 30) {
      throw new Error('Title must be less than 20 characters');
    }
    
    if (input.description && input.description.length > 300) {
      throw new Error('Description must be less than 300 characters');
    }
    if (input.location && input.location.length > 100) {
      throw new Error('Location must be less than 100 characters');
    }
    if (input.capacity !== undefined && input.capacity !== null) {
      if (!Number.isInteger(input.capacity) || input.capacity <=  0) {
        throw new Error('Capacity must be a positive integer');
      }
    }
    if (!input.eventDate) {
      throw new Error('Event Date is required');
    } 
    const [day, month, year] = input.eventDate.split('/').map(Number);
    if (isNaN(new Date(year, month - 1, day).getTime()) || new Date(year, month - 1, day) <= new Date()) {
      throw new Error('Event date must be a valid future date in DD/MM/YYYY format');
    }
    const result = await dbCreateEvent(input);
    return result;
  } catch (error) {
    console.error('createEvent error', error);
    throw error;
  }
}

/**
 * Stuart
 * Updates an existing event identified by eventId with the provided fields.
 * Only the fields present in input will be updated.
 * Returns the updated event if successful, or null if the event was not found.
 */
export async function updateEvent(
  eventId: number,
  input: UpdateEventInput
): Promise<Event | null> {
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Emma
 * Deletes an event by its ID.
 * Returns true if the event was deleted, or false if no event was found with the given ID.
 */
export async function deleteEvent(eventId: number): Promise<boolean> {
  
  try {
    const result = await dbDeleteEvent(eventId);
    return result;
  } catch (error) {
    console.error('Delete event error:', error);
    return false;
  }
}

export default pool;
