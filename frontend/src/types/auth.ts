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
