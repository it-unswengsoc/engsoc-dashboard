import { Router } from 'express';
import { verifyAuthToken, requireAdmin } from '../middleware/auth';
import { listUsers, updateUserRoleAndPortfolio, USER_ROLES, USER_PORTFOLIOS } from '../functions/admin';
import type { UserPortfolio, UserRole } from '../functions/admin';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler, ok } from '../lib/http';

const router = Router();

router.use(verifyAuthToken, requireAdmin);

/**
 * GET /admin/users
 * Lists every user account — admin only (see requireAdmin).
 */
router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    ok(res, await listUsers());
  }, 'Failed to load users'),
);

/**
 * PATCH /admin/users/:userId
 * Updates a user's role, port(folio) and/or treasurer flag. Body:
 * { role?, port?, isTreasurer? } — port may be explicitly null to clear it
 * back to unassigned. Making someone treasurer takes it off whoever had it.
 * role and port are validated
 * against the same enum values Postgres itself enforces on the column, so a
 * bad value 400s here rather than surfacing a raw database error.
 */
router.patch(
  '/users/:userId',
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId)) throw new ValidationError('Invalid user id');

    const { role, port, isTreasurer } = req.body as { role?: string; port?: string | null; isTreasurer?: unknown };

    if (role !== undefined && !USER_ROLES.includes(role as UserRole)) {
      throw new ValidationError(`role must be one of: ${USER_ROLES.join(', ')}`);
    }
    if (port !== undefined && port !== null && !USER_PORTFOLIOS.includes(port as UserPortfolio)) {
      throw new ValidationError(`port must be one of: ${USER_PORTFOLIOS.join(', ')}`);
    }
    if (isTreasurer !== undefined && typeof isTreasurer !== 'boolean') {
      throw new ValidationError('isTreasurer must be true or false');
    }
    if (role === undefined && port === undefined && isTreasurer === undefined) {
      throw new ValidationError('Nothing to update — provide role, port and/or isTreasurer');
    }

    const updated = await updateUserRoleAndPortfolio(
      userId,
      role as UserRole | undefined,
      port as UserPortfolio | null | undefined,
      isTreasurer,
    );
    if (!updated) throw new NotFoundError('User not found');

    ok(res, updated);
  }, 'Failed to update user'),
);

export default router;
