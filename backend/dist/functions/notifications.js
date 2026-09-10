"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationsForUser = getNotificationsForUser;
exports.getNotificationById = getNotificationById;
exports.createNotification = createNotification;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.deleteNotification = deleteNotification;
const pg_1 = require("pg");
const notifications_1 = require("../database/notifications");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
/**
 * Ethan
 * Retrieves all notifications for a given user, ordered by creation date descending.
 * Returns an array of notifications, or an empty array if none exist.
 */
async function getNotificationsForUser(userId) {
    // TODO: implement
    throw new Error('Not implemented');
}
/**
 * Stuart
 * Retrieves a single notification by its ID.
 * Returns the notification if found, or null if no notification exists with the given ID.
 */
async function getNotificationById(notificationId) {
    // TODO: implement
    throw new Error('Not implemented');
}
/**
 * Emma
 * Creates a new notification for a user.
 * Returns the newly created notification, or null if creation failed.
 */
async function createNotification(input) {
    try {
        const result = await (0, notifications_1.dbCreateNotification)(input);
        return result;
    }
    catch (error) {
        console.error('Create Notification error:', error);
        return null;
    }
}
/**
 * Ethan
 * Marks a single notification as read by its ID.
 * Returns the updated notification if found, or null if no notification exists with the given ID.
 */
async function markNotificationRead(notificationId) {
    // TODO: implement
    throw new Error('Not implemented');
}
/**
 * Stuart
 * Marks all unread notifications for a given user as read.
 * Returns the number of notifications that were updated.
 */
async function markAllNotificationsRead(userId) {
    // TODO: implement
    throw new Error('Not implemented');
}
/**
 * Emma
 * Deletes a notification by its ID.
 * Returns true if the notification was deleted, or false if no notification was found with the given ID.
 */
async function deleteNotification(notificationId) {
    try {
        const result = await (0, notifications_1.dbDeleteNotification)(notificationId);
        return result;
    }
    catch (error) {
        console.error('Delete notification error', error);
        return false;
    }
}
exports.default = pool;
//# sourceMappingURL=notifications.js.map