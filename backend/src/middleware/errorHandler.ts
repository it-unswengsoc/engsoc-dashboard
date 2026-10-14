import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';

/** 404 for any path no router matched. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ status: 'error', message: 'Route not found' });
}

/**
 * The one place errors become responses. AppErrors carry their own status
 * and a message written for the member to read; anything else is a bug or
 * an outage, so it's logged and answered with a generic 500.
 */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(error);

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ status: 'error', message: error.message });
    return;
  }

  console.error(`${req.method} ${req.originalUrl} failed:`, error);
  res.status(500).json({
    status: 'error',
    message: res.locals.fallbackMessage ?? 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && error instanceof Error && { error: error.message }),
  });
}
