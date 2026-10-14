import type { Profile, AuthResponse } from '@/types/auth';
import { USE_MOCK } from '@/services/api-config';
import { api } from '@/services/api-client';

export type { Profile, AuthResponse };

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) {
    const { login: mockLogin } = await import('@/mocks/functions/auth');
    return mockLogin(email, password);
  }

  return api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password }, errorMessage: 'Login failed' });
}

export async function getProfile(token: string): Promise<Profile> {
  if (USE_MOCK) {
    const { getProfile: mockGetProfile } = await import('@/mocks/functions/auth');
    return mockGetProfile(token);
  }

  return api<Profile>('/auth/profile', { token, errorMessage: 'Failed to load profile' });
}

/* A 401 (expired session) throws an ApiError that isUnauthorized() spots.
   The endpoint requires both names and rejects a partial update, so callers
   send the full pair even when only one changed. */
export async function updateProfile(token: string, firstName: string, lastName: string): Promise<Profile> {
  if (USE_MOCK) {
    const { updateProfile: mockUpdateProfile } = await import('@/mocks/functions/auth');
    return mockUpdateProfile(token, firstName, lastName);
  }

  return api<Profile>('/auth/profile', {
    method: 'PUT',
    token,
    body: { firstName, lastName },
    errorMessage: 'Failed to update profile',
  });
}
