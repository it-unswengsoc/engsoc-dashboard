"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_PORTFOLIOS = exports.USER_ROLES = void 0;
exports.isUserAdmin = isUserAdmin;
exports.listUsers = listUsers;
exports.updateUserRoleAndPortfolio = updateUserRoleAndPortfolio;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});
exports.USER_ROLES = ['member', 'director', 'executive', 'admin'];
exports.USER_PORTFOLIOS = [
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
function rowToAdminUser(row) {
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
async function isUserAdmin(userId) {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.role === 'admin';
}
/**
 * Lists every user account for the admin panel's table, alphabetically by
 * name.
 */
async function listUsers() {
    const result = await pool.query(`SELECT id, email, first_name, last_name, role, port, is_active, created_at, last_login, google_id
     FROM users
     ORDER BY first_name, last_name`);
    return result.rows.map(rowToAdminUser);
}
/**
 * Updates a user's role and/or portfolio. Both are independently optional —
 * undefined leaves that column untouched, whereas port: null explicitly
 * clears it back to unassigned (role has no such "clear" state; it's never
 * nullable). Returns null if the user doesn't exist or neither field was
 * given to update.
 */
async function updateUserRoleAndPortfolio(userId, role, port) {
    const sets = [];
    const values = [];
    if (role !== undefined) {
        values.push(role);
        sets.push(`role = $${values.length}`);
    }
    if (port !== undefined) {
        values.push(port);
        sets.push(`port = $${values.length}`);
    }
    if (sets.length === 0)
        return null;
    values.push(userId);
    const result = await pool.query(`UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, email, first_name, last_name, role, port, is_active, created_at, last_login, google_id`, values);
    return result.rows.length > 0 ? rowToAdminUser(result.rows[0]) : null;
}
//# sourceMappingURL=admin.js.map