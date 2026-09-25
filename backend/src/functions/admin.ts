import { Pool, QueryResult } from 'pg';
import type { AuthorRole } from './announcements';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

// Same four-level role the users.role column (a Postgres `user_role` enum)
// already enforces — reusing announcements.ts's AuthorRole rather than
// redeclaring it, since it's the same set of values.
export type UserRole = AuthorRole;
export const USER_ROLES: UserRole[] = ['member', 'director', 'executive', 'admin'];

// The users.port column (a Postgres `port_type` enum) — each member's
// EngSoc portfolio/department, e.g. which Shared Drive department they run.
// Mirrors the department headings in functions/drive.ts's DEPARTMENT_DEFS,
// minus Cabinet's absorbed Treasury/Arc Del drives and the Resources
// catch-all (neither is a portfolio a person holds). Nullable — Drive OAuth
// carries no reliable signal for this, so it starts unassigned and is set
// by hand in the admin panel.
export type UserPortfolio =
  | 'cabinet'
  | 'careers'
  | 'IT'
  | 'publication'
  | 'marketing'
  | 'socials'
  | 'sponsorships'
  | 'programs'
  | 'outreach'
  | 'HR';
export const USER_PORTFOLIOS: UserPortfolio[] = [
  'cabinet',
  'careers',
  'IT',
  'publication',
  'marketing',
  'socials',
  'sponsorships',
  'programs',
  'outreach',
  'HR',
];

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  port: UserPortfolio | null;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  // Whether this account has ever signed in with Google (google_id set) —
  // the admin panel uses this to explain why a member's port can't just be
  // read off their Google account automatically (see the module comment
  // above): there's no Google Workspace Admin SDK access here, only the
  // regular Calendar/Drive OAuth scopes, so it's always a manual call.
  hasGoogleAccount: boolean;
}

function rowToAdminUser(row: any): AdminUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    port: row.port,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastLogin: row.last_login,
    hasGoogleAccount: row.google_id !== null,
  };
}

/**
 * Checks whether the given user currently holds the admin role — the gate
 * for every /admin/* route (see routes/auth.ts's requireAdmin). Queried
 * fresh per-request rather than trusted off the JWT: the token is minted at
 * login (functions/auth.ts's generateToken) and never carries role, so a
 * role change needs to take effect on the member's very next request, not
 * only after their token expires and they log back in.
 */
export async function isUserAdmin(userId: number): Promise<boolean> {
  const result: QueryResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.role === 'admin';
}

/**
 * Lists every user account for the admin panel's table, alphabetically by
 * name.
 */
export async function listUsers(): Promise<AdminUser[]> {
  const result: QueryResult = await pool.query(
    `SELECT id, email, first_name, last_name, role, port, is_active, created_at, last_login, google_id
     FROM users
     ORDER BY first_name, last_name`
  );
  return result.rows.map(rowToAdminUser);
}

/**
 * Updates a user's role and/or portfolio. Both are independently optional —
 * undefined leaves that column untouched, whereas port: null explicitly
 * clears it back to unassigned (role has no such "clear" state; it's never
 * nullable). Returns null if the user doesn't exist or neither field was
 * given to update.
 */
export async function updateUserRoleAndPortfolio(
  userId: number,
  role: UserRole | undefined,
  port: UserPortfolio | null | undefined
): Promise<AdminUser | null> {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (role !== undefined) {
    values.push(role);
    sets.push(`role = $${values.length}`);
  }
  if (port !== undefined) {
    values.push(port);
    sets.push(`port = $${values.length}`);
  }
  if (sets.length === 0) return null;

  values.push(userId);
  const result: QueryResult = await pool.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, email, first_name, last_name, role, port, is_active, created_at, last_login, google_id`,
    values
  );

  return result.rows.length > 0 ? rowToAdminUser(result.rows[0]) : null;
}
