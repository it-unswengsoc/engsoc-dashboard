import type { AdminUser, UpdateUserInput } from '@/types/admin';
import { USE_MOCK } from '@/services/api-config';
import { api } from '@/services/api-client';

export type { AdminUser, UpdateUserInput };

/* Admin-only — the backend 403s anyone whose own role isn't 'admin' (see
   backend/src/routes/auth.ts's requireAdmin), regardless of what the
   frontend chooses to show. */
export async function getUsers(token: string): Promise<AdminUser[]> {
  if (USE_MOCK) {
    const { getUsers: mockGetUsers } = await import('@/mocks/functions/admin');
    return mockGetUsers();
  }

  return api<AdminUser[]>('/admin/users', { token, errorMessage: 'Failed to load users' });
}

export async function updateUser(token: string, userId: number, updates: UpdateUserInput): Promise<AdminUser> {
  if (USE_MOCK) {
    const { updateUser: mockUpdateUser } = await import('@/mocks/functions/admin');
    return mockUpdateUser(userId, updates);
  }

  return api<AdminUser>(`/admin/users/${userId}`, {
    method: 'PATCH',
    token,
    body: updates,
    errorMessage: 'Failed to update user',
  });
}
