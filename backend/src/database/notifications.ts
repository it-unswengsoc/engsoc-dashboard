import { Pool, QueryResult } from 'pg';
import { Notification, CreateNotificationInput } from '../functions/notifications';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Maps a raw database row to the Notification interface,
 * converting snake_case column names to camelCase.
 */
function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/**
 * Fetches all notifications for a given user, ordered by creation date descending.
 * Returns an array of Notification objects (empty array if none exist).
 */
export async function dbGetNotificationsForUser(userId: number): Promise<Notification[]> {
  const result: QueryResult = await pool.query(
    `SELECT id, user_id, event_id, type, title, message, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(rowToNotification);
}

/**
 * Fetches a single notification by its ID.
 * Returns the Notification if found, or null if no row matches.
 */
export async function dbGetNotificationById(
  notificationId: number
): Promise<Notification | null> {
  const result: QueryResult = await pool.query(
    `SELECT id, user_id, event_id, type, title, message, is_read, created_at
     FROM notifications
     WHERE id = $1`,
    [notificationId]
  );
  if (result.rows.length === 0) return null;
  return rowToNotification(result.rows[0]);
}

/**
 * Inserts a new notification row and returns the created Notification.
 * Returns null if the insert did not produce a row.
 */
export async function dbCreateNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  const result: QueryResult = await pool.query(
    `INSERT INTO notifications
       (user_id, event_id, type, title, message, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, user_id, event_id, type, title, message, is_read, created_at`,
    [
      input.userId,
      input.eventId ?? null,
      input.type,
      input.title,
      input.message ?? null,
    ]
  );
  if (result.rows.length === 0) return null;
  return rowToNotification(result.rows[0]);
}

/**
 * Sets is_read to true on a single notification by its ID.
 * Returns the updated Notification, or null if no notification with that ID exists.
 */
export async function dbMarkNotificationRead(
  notificationId: number
): Promise<Notification | null> {
  const result: QueryResult = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1
     RETURNING id, user_id, event_id, type, title, message, is_read, created_at`,
    [notificationId]
  );
  if (result.rows.length === 0) return null;
  return rowToNotification(result.rows[0]);
}

/**
 * Sets is_read to true on all unread notifications belonging to a user.
 * Returns the count of rows updated.
 */
export async function dbMarkAllNotificationsRead(userId: number): Promise<number> {
  const result: QueryResult = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return result.rowCount ?? 0;
}

/**
 * Deletes the notification with the given ID.
 * Returns true if a row was deleted, false if no notification with that ID existed.
 */
export async function dbDeleteNotification(notificationId: number): Promise<boolean> {
  const result: QueryResult = await pool.query(
    `DELETE FROM notifications WHERE id = $1 RETURNING id`,
    [notificationId]
  );
  return (result.rowCount ?? 0) > 0;
}
