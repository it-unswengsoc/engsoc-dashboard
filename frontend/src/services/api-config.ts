/* Server-side fetch (Server Components, this file's own callers) needs a fully
   qualified URL — there's no browser to resolve a relative path against, and
   that's true at every request, not just during build-time prerendering.
   Client-side callers get a relative path, which the browser resolves fine. */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') return '';

  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/* All backend calls go through /api/backend/*, the only prefix vercel.json
   routes to the backend service. */
export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}/api/backend${path}`;
}
