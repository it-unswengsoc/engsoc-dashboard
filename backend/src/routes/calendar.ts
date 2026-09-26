import { Router, Request, Response } from 'express';
import { verifyAuthToken } from './auth';
import { getUserGoogleRefreshToken } from '../functions/auth';
import {
  getUserCalendarEvents,
  createUserCalendarEvent,
  updateUserCalendarEvent,
  deleteUserCalendarEvent,
} from '../functions/user-calendar';

const router = Router();

const NOT_CONNECTED_MESSAGE = "Your Google Calendar isn't connected — sign out and back in with Google first.";

/**
 * GET /calendar/events
 * Lists events from every calendar the signed-in member can see in their
 * own Google account — not Postgres. `connected: false` means this account
 * has no stored Google refresh token yet (a password-only account, or a
 * Google account that hasn't signed in since this feature shipped) — the
 * frontend prompts them to sign out and back in with Google in that case.
 *
 * Defaults to a window from one year ago to one year from now; pass
 * ?from=&to= (ISO datetimes) to widen it, e.g. for a member paging further
 * out in the Year view.
 */
router.get('/events', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const refreshToken = await getUserGoogleRefreshToken(user.userId);

    if (!refreshToken) {
      return res.status(200).json({
        status: 'success',
        data: [],
        connected: false,
      });
    }

    const now = new Date();
    const timeMin =
      typeof req.query.from === 'string'
        ? req.query.from
        : new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
    const timeMax =
      typeof req.query.to === 'string'
        ? req.query.to
        : new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();

    const events = await getUserCalendarEvents(refreshToken, timeMin, timeMax);

    res.status(200).json({
      status: 'success',
      data: events,
      connected: true,
    });
  } catch (error) {
    console.error('Get user calendar events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * POST /calendar/events
 * Creates a personal event directly on the signed-in member's own Google
 * Calendar — not Postgres, not shared with anyone else. Auth-only: it's
 * inherently scoped to "my own calendar" by construction (writes go through
 * the caller's own refresh token, so there's nothing else to authorize).
 */
router.post('/events', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: NOT_CONNECTED_MESSAGE });
    }

    const { title, description, location, startsAt, endsAt, allDay } = req.body;
    if (!title || !startsAt || !endsAt) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields: title, startsAt, endsAt' });
    }

    const event = await createUserCalendarEvent(refreshToken, {
      title,
      description,
      location,
      startsAt,
      endsAt,
      allDay: !!allDay,
    });

    res.status(201).json({ status: 'success', message: 'Event created', data: event });
  } catch (error) {
    console.error('Create personal calendar event error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create event',
    });
  }
});

/**
 * PUT /calendar/events/:googleEventId
 * Updates a personal event on the signed-in member's own Google Calendar.
 */
router.put('/events/:googleEventId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: NOT_CONNECTED_MESSAGE });
    }

    const { title, description, location, startsAt, endsAt, allDay } = req.body;
    const event = await updateUserCalendarEvent(refreshToken, req.params.googleEventId, {
      title,
      description,
      location,
      startsAt,
      endsAt,
      allDay,
    });

    res.status(200).json({ status: 'success', message: 'Event updated', data: event });
  } catch (error) {
    console.error('Update personal calendar event error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update event',
    });
  }
});

/**
 * DELETE /calendar/events/:googleEventId
 * Deletes a personal event from the signed-in member's own Google Calendar.
 */
router.delete('/events/:googleEventId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: NOT_CONNECTED_MESSAGE });
    }

    await deleteUserCalendarEvent(refreshToken, req.params.googleEventId);
    res.status(200).json({ status: 'success', message: 'Event deleted' });
  } catch (error) {
    console.error('Delete personal calendar event error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to delete event',
    });
  }
});

export default router;
