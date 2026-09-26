import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

export type RsvpStatus = 'going' | 'not_going';

export interface RsvpEntry {
  userId: number;
  name: string;
  status: RsvpStatus;
}

/**
 * Records (or changes) a member's RSVP — upserts on the existing
 * UNIQUE(event_id, user_id) constraint, so pressing "Going" then later
 * "Can't come" just flips the same row rather than erroring on a duplicate.
 */
export async function dbSetRsvp(eventId: number, userId: number, status: RsvpStatus): Promise<void> {
  await pool.query(
    `INSERT INTO event_attendees (event_id, user_id, status, registered_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (event_id, user_id)
     DO UPDATE SET status = $3, registered_at = NOW()`,
    [eventId, userId, status]
  );
}

/**
 * Every member who has explicitly responded to this event, split by status,
 * with names resolved via a join (so the frontend doesn't need a separate
 * directory lookup just to render the tracker).
 */
export async function dbGetRsvpEntries(eventId: number): Promise<RsvpEntry[]> {
  const result: QueryResult = await pool.query(
    `SELECT ea.user_id, ea.status, u.first_name, u.last_name
     FROM event_attendees ea
     JOIN users u ON u.id = ea.user_id
     WHERE ea.event_id = $1
     ORDER BY ea.registered_at ASC`,
    [eventId]
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    name: `${row.first_name} ${row.last_name}`,
    status: row.status,
  }));
}
