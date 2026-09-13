import type { Profile, AuthResponse } from '@/types/auth';

export const mockProfile: Profile = {
  id: 1,
  email: 'admin@engsoc.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00.000Z',
};

export const mockAuthResponse: AuthResponse = {
  token: 'mock-jwt-token',
  user: mockProfile,
};
