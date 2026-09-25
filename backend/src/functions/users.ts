import { Pool, QueryResult } from 'pg';
import type { AuthorRole } from './announcements';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

/* A minimal, non-admin member directory — every active user, without the
   admin-only fields (isActive/lastLogin/hasGoogleAccount) that
   functions/admin.ts's listUsers exposes. Backs anything that needs to pick
   a real person: the task assignee picker, and @mention resolution/lookup
   for announcements and comments. Any signed-in member can read this (see
   routes/users.ts) — it's not gated to admins the way user *management* is. */
export interface DirectoryUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: AuthorRole;
  port: string | null;
}

function rowToDirectoryUser(row: any): DirectoryUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    port: row.port,
  };
}

export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
  const result: QueryResult = await pool.query(
    `SELECT id, first_name, last_name, email, role, port
     FROM users
     WHERE is_active = true
     ORDER BY first_name, last_name`
  );
  return result.rows.map(rowToDirectoryUser);
}

/**
 * Looks up a single user's role — the check behind requireRole (see
 * routes/auth.ts). Queried fresh per-request rather than trusted off the
 * JWT, same reasoning as functions/admin.ts's isUserAdmin: a role change
 * needs to take effect on the member's very next request.
 */
export async function getUserRole(userId: number): Promise<AuthorRole | null> {
  const result: QueryResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.role ?? null;
}
