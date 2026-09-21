import type { RequestDetail } from '@/types/requests';
import { mockRequests } from '@/mocks/data/requests';

export async function getRequests(): Promise<RequestDetail[]> {
  return mockRequests;
}
