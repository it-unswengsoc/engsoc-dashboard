"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDirectoryUsers = listDirectoryUsers;
exports.getUserRole = getUserRole;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});
function rowToDirectoryUser(row) {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        port: row.port,
    };
}
async function listDirectoryUsers() {
    const result = await pool.query(`SELECT id, first_name, last_name, email, role, port
     FROM users
     WHERE is_active = true
     ORDER BY first_name, last_name`);
    return result.rows.map(rowToDirectoryUser);
}
/**
 * Looks up a single user's role — the check behind requireRole (see
 * routes/auth.ts). Queried fresh per-request rather than trusted off the
 * JWT, same reasoning as functions/admin.ts's isUserAdmin: a role change
 * needs to take effect on the member's very next request.
 */
async function getUserRole(userId) {
    const result = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.role ?? null;
}
//# sourceMappingURL=users.js.map