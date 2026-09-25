export type UserRole = 'member' | 'director' | 'executive' | 'admin';

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  // Matches port_type in database/create-tables.sql — see @/lib/ports for
  // the valid values and their display labels (shared with the requests
  // feature, which already targets requests at a port). Nullable: no
  // reliable Google signal for this exists via the app's current OAuth
  // scopes, so it starts unassigned and is set by hand here.
  port: string | null;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  hasGoogleAccount: boolean;
}

export interface UpdateUserInput {
  role?: UserRole;
  port?: string | null;
}
