import { Router } from 'express';
import { verifyAuthToken } from '../middleware/auth';
import { listDirectoryUsers } from '../functions/users';
import { asyncHandler, ok } from '../lib/http';

const router = Router();

/**
 * GET /users
 * The member directory — any signed-in user, not just admins (contrast
 * with GET /admin/users). Backs the task assignee picker and @mention
 * resolution on the frontend.
 */
router.get(
  '/',
  verifyAuthToken,
  asyncHandler(async (_req, res) => {
    ok(res, await listDirectoryUsers());
  }, 'Failed to load users'),
);

export default router;
