import { apiUrl } from '@/services/api-config';

/* Every service talks to the backend through these two functions, so auth
   headers, JSON encoding and error handling live in one place. The backend
   answers { status: 'success', data, ...extra } or
   { status: 'error', message } (see backend/src/lib/http.ts and
   middleware/errorHandler.ts). */

/** A non-2xx response. `message` is the backend's, written for the member to read. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** True for a 401 — the session token is missing, invalid or expired. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export interface ApiRequest {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** The signed-in member's JWT; omitted for public endpoints. */
  token?: string;
  /** Sent as JSON. */
  body?: unknown;
  /** Used when an error response carries no message of its own. */
  errorMessage: string;
}

/** The success envelope: `data` plus any fields sent beside it (e.g. `connected`). */
export type ApiEnvelope = { data: unknown } & Record<string, unknown>;

/** Sends a request and returns the whole success envelope, or throws ApiError. */
export async function apiFetch(
  path: string,
  { method = 'GET', token, body, errorMessage }: ApiRequest,
): Promise<ApiEnvelope> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    // Reads always want the current state, never a cached copy.
    cache: method === 'GET' ? 'no-store' : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.message || errorMessage, res.status);
  return json as ApiEnvelope;
}

/** Sends a request and returns just its `data`, typed as T. */
export async function api<T>(path: string, request: ApiRequest): Promise<T> {
  return (await apiFetch(path, request)).data as T;
}
