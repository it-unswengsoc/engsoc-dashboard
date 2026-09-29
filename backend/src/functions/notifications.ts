import {
  dbCreateNotification,
  dbCreateNotificationsBulk,
  dbDeleteNotification,
  dbGetNotificationById,
  dbGetNotificationsForUser,
  dbMarkAllNotificationsRead,
  dbMarkNotificationRead,
} from '../database/notifications';
import { getUserProfile } from './auth';
import { sendEmail, renderNotificationEmail, escapeHtml } from './email';
import pool from '../database/pool';


// Matches the notification_type enum in database/create-tables.sql.
export type NotificationType = 'event' | 'alert' | 'announcement' | 'task' | 'request';

export interface Notification {
  id: number;
  userId: number;
  eventId: number | null;
  taskId: number | null;
  requestId: number | null;
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
  requestId?: number;
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
 * Emails every notification's recipient the same title/message already
 * shown in-app — no separate copy needed per notification type. Fire-and-
 * forget from the caller's point of view: awaited here so the individual
 * sendEmail failures (already caught inside sendEmail itself) don't reject,
 * but never awaited by createNotification/createNotificationsBulk's own
 * callers, so a slow or failing email never delays the in-app notification
 * actually existing. No-ops per-recipient if their profile can't be found.
 */
async function notifyByEmail(notifications: Notification[]): Promise<void> {
  await Promise.all(
    notifications.map(async (n) => {
      try {
        const profile = await getUserProfile(n.userId);
        if (!profile) return;
        const bodyHtml = `<p style="margin:0 0 12px;">${escapeHtml(n.title)}</p>${
          n.message ? `<p style="margin:0;color:#555;">${escapeHtml(n.message)}</p>` : ''
        }`;
        await sendEmail(profile.email, n.title, renderNotificationEmail(profile.firstName, bodyHtml));
      } catch (error) {
        console.error('Notify by email error:', error);
      }
    })
  );
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
    if (result) void notifyByEmail([result]);
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
    const created = await dbCreateNotificationsBulk(inputs);
    void notifyByEmail(created);
    return created;
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
