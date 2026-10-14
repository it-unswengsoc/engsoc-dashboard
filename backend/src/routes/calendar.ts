import { Router } from 'express';
import { getUserGoogleRefreshToken } from '../functions/auth';
import {
  getUserCalendarEvents,
  createUserCalendarEvent,
  updateUserCalendarEvent,
  deleteUserCalendarEvent,
} from '../functions/user-calendar';
import { verifyAuthToken, type AuthedRequest } from '../middleware/auth';
import { ValidationError } from '../lib/errors';
import { asyncHandler, created, ok } from '../lib/http';

const router = Router();

router.use(verifyAuthToken);

const NOT_CONNECTED_MESSAGE = "Your Google Calendar isn't connected — sign out and back in with Google first.";

/* The member's own refresh token — every write here goes through it, so
   there's nothing else to authorize. 400s when they haven't connected
   Google yet. */
async function requireRefreshToken(req: AuthedRequest): Promise<string> {
  const refreshToken = await getUserGoogleRefreshToken(req.user.userId);
  if (!refreshToken) throw new ValidationError(NOT_CONNECTED_MESSAGE);
  return refreshToken;
}

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
router.get(
  '/events',
  asyncHandler(async (req: AuthedRequest, res) => {
    const refreshToken = await getUserGoogleRefreshToken(req.user.userId);
    if (!refreshToken) return ok(res, [], { connected: false });

    const now = new Date();
    const timeMin =
      typeof req.query.from === 'string'
        ? req.query.from
        : new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
    const timeMax =
      typeof req.query.to === 'string'
        ? req.query.to
        : new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();

    ok(res, await getUserCalendarEvents(refreshToken, timeMin, timeMax), { connected: true });
  }),
);

/* Google rejecting a write is almost always a malformed event (bad dates,
   a deleted event id), so its message goes back as a 400 for the member. */

/**
 * POST /calendar/events
 * Creates a personal event directly on the signed-in member's own Google
 * Calendar — not Postgres, not shared with anyone else.
 */
router.post(
  '/events',
  asyncHandler(async (req: AuthedRequest, res) => {
    const refreshToken = await requireRefreshToken(req);

    const { title, description, location, startsAt, endsAt, allDay } = req.body;
    if (!title || !startsAt || !endsAt) {
      throw new ValidationError('Missing required fields: title, startsAt, endsAt');
    }

    const event = await createUserCalendarEvent(refreshToken, {
      title,
      description,
      location,
      startsAt,
      endsAt,
      allDay: !!allDay,
    }).catch((error) => {
      throw ValidationError.from(error, 'Failed to create event');
    });

    created(res, event, { message: 'Event created' });
  }),
);

/**
 * PUT /calendar/events/:googleEventId
 * Updates a personal event on the signed-in member's own Google Calendar.
 */
router.put(
  '/events/:googleEventId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const refreshToken = await requireRefreshToken(req);

    const { title, description, location, startsAt, endsAt, allDay } = req.body;
    const event = await updateUserCalendarEvent(refreshToken, req.params.googleEventId, {
      title,
      description,
      location,
      startsAt,
      endsAt,
      allDay,
    }).catch((error) => {
      throw ValidationError.from(error, 'Failed to update event');
    });

    ok(res, event, { message: 'Event updated' });
  }),
);

/**
 * DELETE /calendar/events/:googleEventId
 * Deletes a personal event from the signed-in member's own Google Calendar.
 */
router.delete(
  '/events/:googleEventId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const refreshToken = await requireRefreshToken(req);

    await deleteUserCalendarEvent(refreshToken, req.params.googleEventId).catch((error) => {
      throw ValidationError.from(error, 'Failed to delete event');
    });

    ok(res, undefined, { message: 'Event deleted' });
  }),
);

export default router;
