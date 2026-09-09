import type { Profile, AuthResponse } from '@/types/auth';
import { mockProfile, mockAuthResponse } from '@/mocks/data/auth';

export async function login(_email: string, _password: string): Promise<AuthResponse> {
  return mockAuthResponse;
}

export async function getProfile(_token: string): Promise<Profile> {
  return mockProfile;
}
