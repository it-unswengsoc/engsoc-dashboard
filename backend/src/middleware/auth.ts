import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../functions/auth';
import { isUserAdmin } from '../functions/admin';
import { getUserRole } from '../functions/users';
import type { AuthorRole } from '../functions/announcements';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';
import { asyncHandler } from '../lib/http';

/** What verifyAuthToken puts on the request — the JWT's payload. */
export interface AuthUser {
  userId: number;
  email: string;
}

/** A request that has passed verifyAuthToken. */
export type AuthedRequest = Request & { user: AuthUser };

/** Rejects the request unless it carries a valid `Authorization: Bearer <jwt>`. */
export function verifyAuthToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const decoded = verifyToken(authHeader.substring(7));
  if (!decoded) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  (req as AuthedRequest).user = decoded;
  next();
}

// Gates every /admin/* route. Must run after verifyAuthToken (needs
// req.user). Checks the database rather than the JWT — role isn't in the
// token, so a change takes effect on the member's very next request rather
// than only after they log back in.
export const requireAdmin = asyncHandler(async (req: AuthedRequest, _res, next) => {
  if (!(await isUserAdmin(req.user.userId))) throw new ForbiddenError('Admin access required');
  next();
});

// General version of requireAdmin for anything short of full admin — e.g.
// "director, executive or admin only" on posting an announcement. Same
// database-not-JWT reasoning.
export function requireRole(allowed: AuthorRole[]) {
  return asyncHandler(async (req: AuthedRequest, _res, next) => {
    const role = await getUserRole(req.user.userId);
    if (!role || !allowed.includes(role)) throw new ForbiddenError('Insufficient permissions');
    next();
  });
}
