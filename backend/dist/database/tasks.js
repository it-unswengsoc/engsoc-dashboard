"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbGetTasksForUser = dbGetTasksForUser;
exports.dbGetTaskById = dbGetTaskById;
exports.dbCreateTask = dbCreateTask;
exports.dbUpdateTaskStatus = dbUpdateTaskStatus;
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});
const TASK_SELECT = `
  SELECT t.id, t.title, t.description,
         t.assigned_by, ab.first_name AS assigned_by_first_name, ab.last_name AS assigned_by_last_name,
         t.assigned_to, ato.first_name AS assigned_to_first_name, ato.last_name AS assigned_to_last_name,
         t.event_id, t.status, t.due_date, t.created_at, t.updated_at, t.completed_at
  FROM tasks t
  LEFT JOIN users ab ON ab.id = t.assigned_by
  LEFT JOIN users ato ON ato.id = t.assigned_to
`;
function rowToTask(row) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        assignedBy: row.assigned_by,
        assignedByName: row.assigned_by_first_name ? `${row.assigned_by_first_name} ${row.assigned_by_last_name}` : null,
        assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_first_name ? `${row.assigned_to_first_name} ${row.assigned_to_last_name}` : null,
        eventId: row.event_id,
        status: row.status,
        dueDate: row.due_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
    };
}
/**
 * Fetches every task assigned to a user, soonest due date first (no due
 * date sorts last, via NULLS LAST).
 */
async function dbGetTasksForUser(userId) {
    const result = await pool.query(`${TASK_SELECT} WHERE t.assigned_to = $1 ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC`, [userId]);
    return result.rows.map(rowToTask);
}
async function dbGetTaskById(taskId) {
    const result = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [taskId]);
    return result.rows.length > 0 ? rowToTask(result.rows[0]) : null;
}
async function dbCreateTask(input) {
    const result = await pool.query(`INSERT INTO tasks (title, description, assigned_by, assigned_to, due_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id`, [input.title, input.description, input.assignedBy, input.assignedTo, input.dueDate]);
    if (result.rows.length === 0)
        return null;
    return dbGetTaskById(result.rows[0].id);
}
/**
 * Updates a task's status, setting completed_at to now when the new status
 * is 'completed' and clearing it otherwise (so un-checking a task back off
 * doesn't leave a stale completion timestamp behind). completedAt is
 * computed here rather than in SQL — using $2 both as the enum value in SET
 * and in a text comparison inside a CASE gave Postgres two different
 * inferred types for the same parameter ("inconsistent types deduced for
 * parameter $2"); passing the already-decided timestamp as its own
 * parameter sidesteps that entirely.
 */
async function dbUpdateTaskStatus(taskId, status) {
    const completedAt = status === 'completed' ? new Date() : null;
    const result = await pool.query(`UPDATE tasks
     SET status = $2,
         completed_at = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`, [taskId, status, completedAt]);
    if (result.rows.length === 0)
        return null;
    return dbGetTaskById(result.rows[0].id);
}
//# sourceMappingURL=tasks.js.map