import type { Profile, AuthResponse } from '@/types/auth';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { Profile, AuthResponse };

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) {
    const { login: mockLogin } = await import('@/mocks/functions/auth');
    return mockLogin(email, password);
  }

  const res = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data.data;
}

export async function getProfile(token: string): Promise<Profile> {
  if (USE_MOCK) {
    const { getProfile: mockGetProfile } = await import('@/mocks/functions/auth');
    return mockGetProfile(token);
  }

  const res = await fetch(apiUrl('/auth/profile'), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new Error('Unauthorized');

  const data = await res.json();
  return data.data;
}
