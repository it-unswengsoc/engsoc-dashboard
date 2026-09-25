import type { AdminUser, UpdateUserInput } from '@/types/admin';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { AdminUser, UpdateUserInput };

/* Admin-only — the backend 403s anyone whose own role isn't 'admin' (see
   backend/src/routes/auth.ts's requireAdmin), regardless of what the
   frontend chooses to show. */
export async function getUsers(token: string): Promise<AdminUser[]> {
  if (USE_MOCK) {
    const { getUsers: mockGetUsers } = await import('@/mocks/functions/admin');
    return mockGetUsers();
  }

  const res = await fetch(apiUrl('/admin/users'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load users');
  return data.data as AdminUser[];
}

export async function updateUser(token: string, userId: number, updates: UpdateUserInput): Promise<AdminUser> {
  if (USE_MOCK) {
    const { updateUser: mockUpdateUser } = await import('@/mocks/functions/admin');
    return mockUpdateUser(userId, updates);
  }

  const res = await fetch(apiUrl(`/admin/users/${userId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update user');
  return data.data as AdminUser;
}
