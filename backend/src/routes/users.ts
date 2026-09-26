import { Router, Request, Response } from 'express';
import { verifyAuthToken } from './auth';
import { listDirectoryUsers } from '../functions/users';

const router = Router();

/**
 * GET /users
 * The member directory — any signed-in user, not just admins (contrast
 * with GET /admin/users). Backs the task assignee picker and @mention
 * resolution on the frontend.
 */
router.get('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const users = await listDirectoryUsers();
    res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    console.error('List directory users error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load users' });
  }
});

export default router;
