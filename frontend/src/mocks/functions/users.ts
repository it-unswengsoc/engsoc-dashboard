import type { DirectoryUser } from '@/types/directory';
import { mockDirectory } from '@/mocks/data/users';

/* A copy, not the live mockDirectory array — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getDirectory(): Promise<DirectoryUser[]> {
  return mockDirectory.slice();
}
