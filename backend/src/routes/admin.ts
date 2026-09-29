import { Router, Request, Response } from 'express';
import { verifyAuthToken, requireAdmin } from './auth';
import {
  listUsers,
  updateUserRoleAndPortfolio,
  InactiveTreasurerError,
  USER_ROLES,
  USER_PORTFOLIOS,
} from '../functions/admin';

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
 * Updates a user's role, port(folio) and/or treasurer flag. Body:
 * { role?, port?, isTreasurer? } — port may be explicitly null to clear it
 * back to unassigned. Making someone treasurer takes it off whoever had it.
 * role and port are validated
 * against the same enum values Postgres itself enforces on the column, so a
 * bad value 400s here rather than surfacing a raw database error.
 */
router.patch('/users/:userId', verifyAuthToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid user id' });
    }

    const { role, port, isTreasurer } = req.body as { role?: string; port?: string | null; isTreasurer?: unknown };

    if (role !== undefined && !USER_ROLES.includes(role as any)) {
      return res.status(400).json({ status: 'error', message: `role must be one of: ${USER_ROLES.join(', ')}` });
    }
    if (port !== undefined && port !== null && !USER_PORTFOLIOS.includes(port as any)) {
      return res.status(400).json({ status: 'error', message: `port must be one of: ${USER_PORTFOLIOS.join(', ')}` });
    }
    if (isTreasurer !== undefined && typeof isTreasurer !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'isTreasurer must be true or false' });
    }
    if (role === undefined && port === undefined && isTreasurer === undefined) {
      return res.status(400).json({ status: 'error', message: 'Nothing to update — provide role, port and/or isTreasurer' });
    }

    const updated = await updateUserRoleAndPortfolio(userId, role as any, port as any, isTreasurer);
    if (!updated) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    if (error instanceof InactiveTreasurerError) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    console.error('Update user error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update user' });
  }
});

export default router;
