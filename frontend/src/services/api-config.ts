/* Frontend and backend are separate Vercel projects/domains now — every
   request, client or server, needs the backend's real absolute URL. There's
   no same-origin relative path that would work here (unlike the old
   combined-domain "Services" setup this replaced). */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/* When true, every service answers from src/mocks instead of the backend. */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
