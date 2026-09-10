"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbGetNotificationsForUser = dbGetNotificationsForUser;
exports.dbGetNotificationById = dbGetNotificationById;
exports.dbCreateNotification = dbCreateNotification;
exports.dbMarkNotificationRead = dbMarkNotificationRead;
exports.dbMarkAllNotificationsRead = dbMarkAllNotificationsRead;
exports.dbDeleteNotification = dbDeleteNotification;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
/**
 * Maps a raw database row to the Notification interface,
 * converting snake_case column names to camelCase.
 */
function rowToNotification(row) {
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
async function dbGetNotificationsForUser(userId) {
    const result = await pool.query(`SELECT id, user_id, event_id, type, title, message, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC`, [userId]);
    return result.rows.map(rowToNotification);
}
/**
 * Fetches a single notification by its ID.
 * Returns the Notification if found, or null if no row matches.
 */
async function dbGetNotificationById(notificationId) {
    const result = await pool.query(`SELECT id, user_id, event_id, type, title, message, is_read, created_at
     FROM notifications
     WHERE id = $1`, [notificationId]);
    if (result.rows.length === 0)
        return null;
    return rowToNotification(result.rows[0]);
}
/**
 * Inserts a new notification row and returns the created Notification.
 * Returns null if the insert did not produce a row.
 */
async function dbCreateNotification(input) {
    const result = await pool.query(`INSERT INTO notifications
       (user_id, event_id, type, title, message, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, user_id, event_id, type, title, message, is_read, created_at`, [
        input.userId,
        input.eventId ?? null,
        input.type,
        input.title,
        input.message ?? null,
    ]);
    if (result.rows.length === 0)
        return null;
    return rowToNotification(result.rows[0]);
}
/**
 * Sets is_read to true on a single notification by its ID.
 * Returns the updated Notification, or null if no notification with that ID exists.
 */
async function dbMarkNotificationRead(notificationId) {
    const result = await pool.query(`UPDATE notifications
     SET is_read = true
     WHERE id = $1
     RETURNING id, user_id, event_id, type, title, message, is_read, created_at`, [notificationId]);
    if (result.rows.length === 0)
        return null;
    return rowToNotification(result.rows[0]);
}
/**
 * Sets is_read to true on all unread notifications belonging to a user.
 * Returns the count of rows updated.
 */
async function dbMarkAllNotificationsRead(userId) {
    const result = await pool.query(`UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false`, [userId]);
    return result.rowCount ?? 0;
}
/**
 * Deletes the notification with the given ID.
 * Returns true if a row was deleted, false if no notification with that ID existed.
 */
async function dbDeleteNotification(notificationId) {
    const result = await pool.query(`DELETE FROM notifications WHERE id = $1 RETURNING id`, [notificationId]);
    return (result.rowCount ?? 0) > 0;
}
//# sourceMappingURL=notifications.js.map