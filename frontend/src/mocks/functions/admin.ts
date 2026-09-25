import type { AdminUser, UpdateUserInput } from '@/types/admin';
import { mockUsers } from '@/mocks/data/admin';

/* A copy, not the live mockUsers array — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getUsers(): Promise<AdminUser[]> {
  return mockUsers.slice();
}

/* Mutates mockUsers directly (module-level, in-memory) so the panel
   reflects a change immediately in local dev — resets on every reload, same
   as every other in-memory mock in this app. */
export async function updateUser(userId: number, updates: UpdateUserInput): Promise<AdminUser> {
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');

  if (updates.role !== undefined) user.role = updates.role;
  if (updates.port !== undefined) user.port = updates.port;

  return user;
}
