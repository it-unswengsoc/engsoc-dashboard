import { Router, Request, Response } from 'express';
import { getAllEvents } from '../functions/events';
import { getTasksForUser } from '../functions/tasks';
import { getAllAnnouncements } from '../functions/announcements';
import { verifyAuthToken } from './auth';

const router = Router();

/**
 * GET /dashboard
 * Everything the dashboard home page shows, in one response: upcoming
 * events, the requester's tasks and every announcement. The frontend used
 * to make three separate requests, and each could land on its own cold
 * serverless instance and pay its own CORS preflight, so the sections
 * filled in one by one. Here the three queries run in parallel and come
 * back together.
 *
 * Trimmed to what the page actually uses: past events and cancelled tasks
 * are left out (the dashboard only counts and lists upcoming events, and
 * shows a task as just done or not done).
 */
router.get('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const [events, tasks, announcements] = await Promise.all([
      getAllEvents(),
      getTasksForUser(user.userId),
      getAllAnnouncements(user.userId),
    ]);

    const now = Date.now();
    res.status(200).json({
      status: 'success',
      data: {
        events: events.filter((e) => new Date(e.startDate).getTime() >= now),
        tasks: tasks.filter((t) => t.status !== 'cancelled'),
        announcements,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
