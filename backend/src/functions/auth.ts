import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool, QueryResult } from 'pg';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
const JWT_EXPIRY = '7d';

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // RDS rejects plaintext connections outright ("no pg_hba.conf entry ...
  // no encryption") — confirmed by connecting directly and reproducing the
  // rejection, then resolving it with this exact option. rejectUnauthorized:
  // false still encrypts the connection; it just skips validating RDS's
  // certificate against a trusted CA, avoiding needing to bundle AWS's own
  // RDS CA certificate. Skipped locally (VERCEL unset) since a local
  // Postgres for dev typically doesn't support SSL at all.
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with its hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      email: string;
    };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ userId: number; email: string } | null> {
  try {
    // Validate inputs
    if (!email || !password || !firstName || !lastName) {
      return null;
    }

    // Check if user already exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user
    const result: QueryResult = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email',
      [email, hashedPassword, firstName, lastName]
    );

    return {
      userId: result.rows[0].id,
      email: result.rows[0].email,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return null;
  }
}

/**
 * Login user and return token
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; userId: number; email: string } | null> {
  try {
    // Validate inputs
    if (!email || !password) {
      return null;
    }

    // Find user
    const result: QueryResult = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];

    // Compare password
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return null;
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [
      user.id,
    ]);

    return {
      token,
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

/**
 * Find the user for a verified Google identity, linking it to an existing
 * local-password account with the same email, or creating a Google-only
 * account (no password_hash) if neither exists.
 *
 * refreshToken, when present, is stored so the backend can later read this
 * member's own Google Calendar on their behalf (see functions/user-calendar.ts).
 * Google only issues one when the consent screen is actually shown, which
 * getGoogleAuthUrl forces on every sign-in via prompt: 'consent' — so this
 * is expected to arrive on every login, not just the first.
 */
export async function findOrCreateGoogleUser(
  googleId: string,
  email: string,
  firstName: string,
  lastName: string,
  refreshToken?: string
): Promise<{ userId: number; email: string } | null> {
  try {
    const byGoogleId: QueryResult = await pool.query(
      'SELECT id, email FROM users WHERE google_id = $1',
      [googleId]
    );

    if (byGoogleId.rows.length > 0) {
      const user = byGoogleId.rows[0];
      if (refreshToken) {
        await pool.query(
          'UPDATE users SET last_login = NOW(), google_refresh_token = $2 WHERE id = $1',
          [user.id, refreshToken]
        );
      } else {
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      }
      return { userId: user.id, email: user.email };
    }

    const byEmail: QueryResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (byEmail.rows.length > 0) {
      const user = byEmail.rows[0];
      await pool.query(
        `UPDATE users
         SET google_id = $1, last_login = NOW()${refreshToken ? ', google_refresh_token = $3' : ''}
         WHERE id = $2`,
        refreshToken ? [googleId, user.id, refreshToken] : [googleId, user.id]
      );
      return { userId: user.id, email: user.email };
    }

    const result: QueryResult = await pool.query(
      `INSERT INTO users (email, google_id, first_name, last_name, google_refresh_token, created_at, last_login)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, email`,
      [email, googleId, firstName || 'Google', lastName || 'User', refreshToken ?? null]
    );

    return { userId: result.rows[0].id, email: result.rows[0].email };
  } catch (error) {
    console.error('findOrCreateGoogleUser error:', error);
    return null;
  }
}

/**
 * Looks up the Google refresh token captured at this member's last Google
 * sign-in, if any. Null for password-only accounts, or a Google account that
 * hasn't signed in since this was added.
 */
export async function getUserGoogleRefreshToken(userId: number): Promise<string | null> {
  try {
    const result: QueryResult = await pool.query(
      'SELECT google_refresh_token FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].google_refresh_token ?? null;
  } catch (error) {
    console.error('Get user Google refresh token error:', error);
    return null;
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: number): Promise<{
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  port: string | null;
  createdAt: string;
} | null> {
  try {
    const result: QueryResult = await pool.query(
      'SELECT id, email, first_name, last_name, role, port, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      port: user.port,
      createdAt: user.created_at,
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: number,
  firstName: string,
  lastName: string
): Promise<boolean> {
  try {
    const result: QueryResult = await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3',
      [firstName, lastName, userId]
    );

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Update profile error:', error);
    return false;
  }
}

export default pool;
