/* Frontend and backend are separate Vercel projects/domains now — every
   request, client or server, needs the backend's real absolute URL. There's
   no same-origin relative path that would work here (unlike the old
   combined-domain "Services" setup this replaced). */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
