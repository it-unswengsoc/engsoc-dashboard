import { Pool, QueryResult } from 'pg';
import { Task, TaskStatus } from '../functions/tasks';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

/* Assignees come back as one JSON array per task (rather than one row per
   assignee) so a task stays a single row whatever its assignee count. */
const TASK_SELECT = `
  SELECT t.id, t.title, t.description,
         t.assigned_by, ab.first_name AS assigned_by_first_name, ab.last_name AS assigned_by_last_name,
         COALESCE(
           (SELECT json_agg(json_build_object('id', u.id, 'firstName', u.first_name, 'lastName', u.last_name, 'port', u.port)
                            ORDER BY u.first_name, u.last_name)
            FROM task_assignees ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.task_id = t.id),
           '[]'
         ) AS assignees,
         t.event_id, t.status, t.due_date, t.created_at, t.updated_at, t.completed_at
  FROM tasks t
  LEFT JOIN users ab ON ab.id = t.assigned_by
`;

const TASK_ORDER = 'ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC';

function rowToTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assignedBy: row.assigned_by,
    assignedByName: row.assigned_by_first_name ? `${row.assigned_by_first_name} ${row.assigned_by_last_name}` : null,
    assignees: row.assignees.map((a: any) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, port: a.port })),
    eventId: row.event_id,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

/**
 * Fetches every task the user is one of the assignees on, soonest due date
 * first (no due date sorts last, via NULLS LAST).
 */
export async function dbGetTasksForUser(userId: number): Promise<Task[]> {
  const result: QueryResult = await pool.query(
    `${TASK_SELECT}
     WHERE EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $1)
     ${TASK_ORDER}`,
    [userId]
  );
  return result.rows.map(rowToTask);
}

/**
 * Fetches a port's board: every task with at least one assignee currently
 * holding that port. Keyed on the assignee's port as it is now, not when the
 * task was made, so a member changing port takes their tasks with them.
 */
export async function dbGetTasksForPort(port: string): Promise<Task[]> {
  const result: QueryResult = await pool.query(
    `${TASK_SELECT}
     WHERE EXISTS (
       SELECT 1 FROM task_assignees ta
       JOIN users u ON u.id = ta.user_id
       WHERE ta.task_id = t.id AND u.port = $1
     )
     ${TASK_ORDER}`,
    [port]
  );
  return result.rows.map(rowToTask);
}

export async function dbGetTaskById(taskId: number): Promise<Task | null> {
  const result: QueryResult = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [taskId]);
  return result.rows.length > 0 ? rowToTask(result.rows[0]) : null;
}

export async function dbIsTaskAssignee(taskId: number, userId: number): Promise<boolean> {
  const result: QueryResult = await pool.query(
    'SELECT 1 FROM task_assignees WHERE task_id = $1 AND user_id = $2',
    [taskId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Inserts the task and its assignees in one transaction, so a task never
 * exists without the people it's for.
 */
export async function dbCreateTask(input: {
  title: string;
  description: string | null;
  dueDate: string | null;
  assignedBy: number;
  assigneeIds: number[];
}): Promise<Task | null> {
  const client = await pool.connect();
  let taskId: number;
  try {
    await client.query('BEGIN');
    const result: QueryResult = await client.query(
      `INSERT INTO tasks (title, description, assigned_by, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [input.title, input.description, input.assignedBy, input.dueDate]
    );
    taskId = result.rows[0].id;
    await client.query(
      `INSERT INTO task_assignees (task_id, user_id)
       SELECT $1, unnest($2::int[])`,
      [taskId, input.assigneeIds]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return dbGetTaskById(taskId);
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
export async function dbUpdateTaskStatus(taskId: number, status: TaskStatus): Promise<Task | null> {
  const completedAt = status === 'completed' ? new Date() : null;
  const result: QueryResult = await pool.query(
    `UPDATE tasks
     SET status = $2,
         completed_at = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [taskId, status, completedAt]
  );
  if (result.rows.length === 0) return null;
  return dbGetTaskById(result.rows[0].id);
}
