import type { RequestDetail } from '@/types/requests';
import { mockRequests } from '@/mocks/data/requests';

/* A copy, not the live mockRequests array — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getRequests(): Promise<RequestDetail[]> {
  return mockRequests.slice();
}
