import { Router } from 'express';
import {
  getNotificationsForUser,
  getNotificationById,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../functions/notifications';
import { verifyAuthToken, type AuthedRequest } from '../middleware/auth';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler, created, ok, parseId } from '../lib/http';

const router = Router();

router.use(verifyAuthToken);

/**
 * GET /notifications
 * Retrieves all notifications for the authenticated user.
 */
router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await getNotificationsForUser(req.user.userId));
  }),
);

/**
 * GET /notifications/:notificationId
 * Retrieves a specific notification by ID.
 */
router.get(
  '/:notificationId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const notification = await getNotificationById(parseId(req.params.notificationId, 'notification'));
    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.userId !== req.user.userId) throw new ForbiddenError('Forbidden');
    ok(res, notification);
  }),
);

/**
 * POST /notifications
 * Creates a new notification. Requires authentication.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { userId, eventId, type, title, message } = req.body;
    if (!userId || !type || !title) throw new ValidationError('Missing required fields: userId, type, title');

    const notification = await createNotification({ userId, eventId, type, title, message });
    if (!notification) throw new ValidationError('Failed to create notification');

    created(res, notification, { message: 'Notification created successfully' });
  }),
);

/**
 * PUT /notifications/read-all
 * Marks all notifications for the authenticated user as read.
 */
router.put(
  '/read-all',
  asyncHandler(async (req: AuthedRequest, res) => {
    const count = await markAllNotificationsRead(req.user.userId);
    ok(res, undefined, { message: `${count} notification(s) marked as read` });
  }),
);

/**
 * PUT /notifications/:notificationId/read
 * Marks a specific notification as read.
 */
router.put(
  '/:notificationId/read',
  asyncHandler(async (req, res) => {
    const notification = await markNotificationRead(parseId(req.params.notificationId, 'notification'));
    if (!notification) throw new NotFoundError('Notification not found');
    ok(res, notification, { message: 'Notification marked as read' });
  }),
);

/**
 * DELETE /notifications/:notificationId
 * Deletes a notification. Requires authentication.
 */
router.delete(
  '/:notificationId',
  asyncHandler(async (req, res) => {
    if (!(await deleteNotification(parseId(req.params.notificationId, 'notification')))) {
      throw new NotFoundError('Notification not found');
    }
    ok(res, undefined, { message: 'Notification deleted successfully' });
  }),
);

export default router;
