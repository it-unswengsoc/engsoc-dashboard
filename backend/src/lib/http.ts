import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ValidationError } from './errors';

type Handler<Req extends Request> = (req: Req, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler so a rejection reaches the error middleware
 * (Express 4 doesn't catch rejected promises itself). `fallbackMessage`
 * replaces the generic "Internal server error" for unexpected failures on
 * this route, e.g. "Failed to load Drive folders".
 */
export function asyncHandler<Req extends Request = Request>(
  handler: Handler<Req>,
  fallbackMessage?: string,
): RequestHandler {
  return (req, res, next) => {
    handler(req as Req, res, next).catch((error: unknown) => {
      if (fallbackMessage) res.locals.fallbackMessage = fallbackMessage;
      next(error);
    });
  };
}

/** Sends `{ status: 'success', data, ...extra }`. */
export function ok(res: Response, data?: unknown, extra: Record<string, unknown> = {}): void {
  res.status(200).json({ status: 'success', ...extra, data });
}

/** Like ok, with 201 Created. */
export function created(res: Response, data?: unknown, extra: Record<string, unknown> = {}): void {
  res.status(201).json({ status: 'success', ...extra, data });
}

/** Parses a numeric route param, or throws a 400 "Invalid <label> ID". */
export function parseId(value: string, label: string): number {
  const id = parseInt(value, 10);
  if (isNaN(id)) throw new ValidationError(`Invalid ${label} ID`);
  return id;
}
