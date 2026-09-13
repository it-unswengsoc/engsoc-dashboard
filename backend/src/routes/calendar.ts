import { Router, Request, Response } from 'express';
import { verifyAuthToken } from './auth';
import { getUserGoogleRefreshToken } from '../functions/auth';
import { getUserCalendarEvents } from '../functions/user-calendar';

const router = Router();

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

export default router;
