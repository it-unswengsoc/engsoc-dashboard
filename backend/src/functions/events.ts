import { Pool, QueryResult } from 'pg';

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
 * Retrieves all events from the database, ordered by event date ascending.
 * Returns an array of events, or an empty array if none exist.
 */
export async function getAllEvents(): Promise<Event[]> {
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Retrieves a single event by its ID.
 * Returns the event if found, or null if no event exists with the given ID.
 */
export async function getEventById(eventId: number): Promise<Event | null> {
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Creates a new event with the provided details.
 * Returns the newly created event, or null if creation failed.
 */
export async function createEvent(input: CreateEventInput): Promise<Event | null> {
  // TODO: implement
  throw new Error('Not implemented');
}

/**
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
 * Deletes an event by its ID.
 * Returns true if the event was deleted, or false if no event was found with the given ID.
 */
export async function deleteEvent(eventId: number): Promise<boolean> {
  // TODO: implement
  throw new Error('Not implemented');
}

export default pool;
