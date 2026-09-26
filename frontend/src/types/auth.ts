export interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  // Matches port_type in database/create-tables.sql — see @/lib/ports.
  // Null until an admin assigns one in the admin panel.
  port: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: Profile;
}
