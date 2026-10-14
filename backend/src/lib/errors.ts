/* Errors the API answers with something other than a 500. Throw one of
   these (or a domain error extending one) from any layer and
   middleware/errorHandler.ts turns it into { status: 'error', message }
   with the matching HTTP status — routes never map errors themselves. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Bad input from the client — 400. */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }

  /* For calls whose every failure is the caller's input (e.g. Google
     rejecting a malformed calendar event) — keeps the upstream message. */
  static from(error: unknown, fallback: string): ValidationError {
    return new ValidationError(error instanceof Error ? error.message : fallback);
  }
}

/** Missing or bad credentials — 401. */
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

/** Signed in, but not allowed to do this — 403. */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

/** No such resource (or the caller mustn't know it exists) — 404. */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

/** The resource's current state doesn't allow this — 409. */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** A third-party service (Google, Places) failed — 502. */
export class UpstreamError extends AppError {
  constructor(message: string) {
    super(message, 502);
  }
}
