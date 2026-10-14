import type { DirectoryUser } from '@/types/directory';
import { USE_MOCK } from '@/services/api-config';
import { api } from '@/services/api-client';

export type { DirectoryUser };

/* Every active member — used for the task assignee picker and @mention
   resolution, neither of which needs (or should have) admin access. */
export async function getDirectory(token: string): Promise<DirectoryUser[]> {
  if (USE_MOCK) {
    const { getDirectory: mockGetDirectory } = await import('@/mocks/functions/users');
    return mockGetDirectory();
  }

  return api<DirectoryUser[]>('/users', { token, errorMessage: 'Failed to load members' });
}
