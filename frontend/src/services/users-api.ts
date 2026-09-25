import type { DirectoryUser } from '@/types/directory';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { DirectoryUser };

/* Every active member — used for the task assignee picker and @mention
   resolution, neither of which needs (or should have) admin access. */
export async function getDirectory(token: string): Promise<DirectoryUser[]> {
  if (USE_MOCK) {
    const { getDirectory: mockGetDirectory } = await import('@/mocks/functions/users');
    return mockGetDirectory();
  }

  const res = await fetch(apiUrl('/users'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load members');
  return data.data as DirectoryUser[];
}
