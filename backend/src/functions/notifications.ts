import { Pool } from 'pg';
import {
  dbCreateNotification,
  dbCreateNotificationsBulk,
  dbDeleteNotification,
  dbGetNotificationById,
  dbGetNotificationsForUser,
  dbMarkAllNotificationsRead,
  dbMarkNotificationRead,
} from '../database/notifications';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // RDS requires SSL — see functions/auth.ts's pool for why.
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

// Matches the notification_type enum in database/create-tables.sql, minus
// 'request' (nothing creates one of those yet).
export type NotificationType = 'event' | 'alert' | 'announcement' | 'task';

export interface Notification {
  id: number;
  userId: number;
  eventId: number | null;
  taskId: number | null;
  type: NotificationType;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: number;
  eventId?: number;
  taskId?: number;
  type: NotificationType;
  title: string;
  message?: string;
}

/**
 * Retrieves all notifications for a given user, ordered by creation date descending.
 * Returns an array of notifications, or an empty array if none exist.
 */
export async function getNotificationsForUser(userId: number): Promise<Notification[]> {
  try {
    return await dbGetNotificationsForUser(userId);
  } catch (error) {
    throw error;
  }
}

/**
 * Retrieves a single notification by its ID.
 * Returns the notification if found, or null if no notification exists with the given ID.
 */
export async function getNotificationById(notificationId: number): Promise<Notification | null> {
  try {
    return await dbGetNotificationById(notificationId);
  } catch (error) {
    throw error;
  }
}

/**
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
 * Creates the same kind of notification for many users at once — one
 * announcement notifying every member, or one portfolio-assigned task
 * notifying everyone in it. Best-effort: logs and returns an empty array
 * rather than throwing, so a notification failure never blocks the
 * announcement/task itself from having been created.
 */
export async function createNotificationsBulk(
  inputs: CreateNotificationInput[]
): Promise<Notification[]> {
  try {
    return await dbCreateNotificationsBulk(inputs);
  } catch (error) {
    console.error('Create notifications bulk error:', error);
    return [];
  }
}

/**
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
 * Marks all unread notifications for a given user as read.
 * Returns the number of notifications that were updated.
 */
export async function markAllNotificationsRead(userId: number): Promise<number> {
  try {
    return await dbMarkAllNotificationsRead(userId);
  } catch (error) {
    throw error;
  }
}

/**
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
