const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: Profile;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) {
    const { mockAuthResponse } = await import('@/mocks/auth');
    return mockAuthResponse;
  }

  const res = await fetch('/api/auth/login', {
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
    const { mockProfile } = await import('@/mocks/auth');
    return mockProfile;
  }

  const res = await fetch('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new Error('Unauthorized');

  const data = await res.json();
  return data.data;
}
