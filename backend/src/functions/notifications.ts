import { Pool } from 'pg';
import { dbCreateNotification, dbDeleteNotification, dbGetNotificationsForUser, dbMarkNotificationRead } from '../database/notifications';
import { dbGetAllEvents } from '../database/events';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Notification {
  id: number;
  userId: number;
  eventId: number | null;
  type: 'event' | 'alert' | 'announcement';
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: number;
  eventId?: number;
  type: 'event' | 'alert' | 'announcement';
  title: string;
  message?: string;
}

/**
 * Ethan
 * Retrieves all notifications for a given user, ordered by creation date descending.
 * Returns an array of notifications, or an empty array if none exist.
 */
export async function getNotificationsForUser(userId: number): Promise<Notification[]> {
  // TODO: implement
  try {
    const result = await dbGetNotificationsForUser(userId);
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Stuart
 * Retrieves a single notification by its ID.
 * Returns the notification if found, or null if no notification exists with the given ID.
 */
export async function getNotificationById(notificationId: number): Promise<Notification | null> {
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Emma
 * Creates a new notification for a user.
 * Returns the newly created notification, or null if creation failed.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification | null> {
  try {
    const result = await dbCreateNotification(input)
    return result
  } catch (error) {
    console.error('Create Notification error:', error);
    return null;
  }
}

/**
 * Ethan
 * Marks a single notification as read by its ID.
 * Returns the updated notification if found, or null if no notification exists with the given ID.
 */
export async function markNotificationRead(
  notificationId: number
): Promise<Notification | null> {
  try {
    const result = await dbMarkNotificationRead(notificationId);
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Stuart
 * Marks all unread notifications for a given user as read.
 * Returns the number of notifications that were updated.
 */
export async function markAllNotificationsRead(userId: number): Promise<number> {
  // TODO: implement
  throw new Error('Not implemented');
}

/**
 * Emma
 * Deletes a notification by its ID.
 * Returns true if the notification was deleted, or false if no notification was found with the given ID.
 */
export async function deleteNotification(notificationId: number): Promise<boolean> {
  try {
    const result = await dbDeleteNotification(notificationId);
    return result;
  } catch (error) {
    console.error('Delete notification error', error);
    return false;
  }
}

export default pool;
