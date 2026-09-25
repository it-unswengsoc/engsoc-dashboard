import { Router, Request, Response } from 'express';
import { verifyAuthToken, requireAdmin } from './auth';
import { listUsers, updateUserRoleAndPortfolio, USER_ROLES, USER_PORTFOLIOS } from '../functions/admin';

const router = Router();

/**
 * GET /admin/users
 * Lists every user account — admin only (see requireAdmin).
 */
router.get('/users', verifyAuthToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await listUsers();
    res.status(200).json({ status: 'success', data: users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load users' });
  }
});

/**
 * PATCH /admin/users/:userId
 * Updates a user's role and/or port(folio). Body: { role?, port? } — port
 * may be explicitly null to clear it back to unassigned. Both are validated
 * against the same enum values Postgres itself enforces on the column, so a
 * bad value 400s here rather than surfacing a raw database error.
 */
router.patch('/users/:userId', verifyAuthToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user id' });
    }

    const { role, port } = req.body as { role?: string; port?: string | null };

    if (role !== undefined && !USER_ROLES.includes(role as any)) {
      return res.status(400).json({ status: 'error', message: `role must be one of: ${USER_ROLES.join(', ')}` });
    }
    if (port !== undefined && port !== null && !USER_PORTFOLIOS.includes(port as any)) {
      return res.status(400).json({ status: 'error', message: `port must be one of: ${USER_PORTFOLIOS.join(', ')}` });
    }
    if (role === undefined && port === undefined) {
      return res.status(400).json({ status: 'error', message: 'Nothing to update — provide role and/or port' });
    }

    const updated = await updateUserRoleAndPortfolio(userId, role as any, port as any);
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update user' });
  }
});

export default router;
