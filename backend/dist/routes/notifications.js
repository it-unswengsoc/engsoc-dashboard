"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_1 = require("../functions/notifications");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
/**
 * GET /api/notification
 * Retrieves all notifications for the authenticated user.
 */
router.get('/', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const notifications = await (0, notifications_1.getNotificationsForUser)(user.userId);
        res.status(200).json({
            status: 'success',
            data: notifications,
        });
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * GET /api/notification/:notificationId
 * Retrieves a specific notification by ID.
 */
router.get('/:notificationId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notificationId);
        if (isNaN(notificationId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid notification ID',
            });
        }
        const notification = await (0, notifications_1.getNotificationById)(notificationId);
        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found',
            });
        }
        const user = req.user;
        if (notification.userId !== user.userId) {
            return res.status(403).json({
                status: 'error',
                message: 'Forbidden',
            });
        }
        res.status(200).json({
            status: 'success',
            data: notification,
        });
    }
    catch (error) {
        console.error('Get notification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * POST /api/notification
 * Creates a new notification. Requires authentication.
 */
router.post('/', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const { userId, eventId, type, title, message } = req.body;
        if (!userId || !type || !title) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: userId, type, title',
            });
        }
        const notification = await (0, notifications_1.createNotification)({ userId, eventId, type, title, message });
        if (!notification) {
            return res.status(400).json({
                status: 'error',
                message: 'Failed to create notification',
            });
        }
        res.status(201).json({
            status: 'success',
            message: 'Notification created successfully',
            data: notification,
        });
    }
    catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * PUT /api/notification/read-all
 * Marks all notifications for the authenticated user as read.
 */
router.put('/read-all', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const count = await (0, notifications_1.markAllNotificationsRead)(user.userId);
        res.status(200).json({
            status: 'success',
            message: `${count} notification(s) marked as read`,
        });
    }
    catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * PUT /api/notification/:notificationId/read
 * Marks a specific notification as read.
 */
router.put('/:notificationId/read', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notificationId);
        if (isNaN(notificationId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid notification ID',
            });
        }
        const notification = await (0, notifications_1.markNotificationRead)(notificationId);
        if (!notification) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Notification marked as read',
            data: notification,
        });
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * DELETE /api/notification/:notificationId
 * Deletes a notification. Requires authentication.
 */
router.delete('/:notificationId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notificationId);
        if (isNaN(notificationId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid notification ID',
            });
        }
        const deleted = await (0, notifications_1.deleteNotification)(notificationId);
        if (!deleted) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Notification deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map