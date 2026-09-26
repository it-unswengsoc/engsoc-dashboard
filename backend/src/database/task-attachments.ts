import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

export interface TaskAttachment {
  id: number;
  taskId: number;
  driveFileId: string;
  name: string;
  webViewLink: string | null;
  mimeType: string | null;
  addedBy: number | null;
  createdAt: string;
}

function rowToAttachment(row: any): TaskAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    driveFileId: row.drive_file_id,
    name: row.name,
    webViewLink: row.web_view_link,
    mimeType: row.mime_type,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export async function dbGetTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
  const result: QueryResult = await pool.query(
    `SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY created_at ASC`,
    [taskId]
  );
  return result.rows.map(rowToAttachment);
}

export async function dbAddTaskAttachment(input: {
  taskId: number;
  driveFileId: string;
  name: string;
  webViewLink: string | null;
  mimeType: string | null;
  addedBy: number;
}): Promise<TaskAttachment> {
  const result: QueryResult = await pool.query(
    `INSERT INTO task_attachments (task_id, drive_file_id, name, web_view_link, mime_type, added_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [input.taskId, input.driveFileId, input.name, input.webViewLink, input.mimeType, input.addedBy]
  );
  return rowToAttachment(result.rows[0]);
}

/** Returns the deleted row's task_id (for the route's ownership check), or null if it didn't exist. */
export async function dbGetTaskAttachmentTaskId(attachmentId: number): Promise<number | null> {
  const result: QueryResult = await pool.query(`SELECT task_id FROM task_attachments WHERE id = $1`, [attachmentId]);
  return result.rows.length === 0 ? null : (result.rows[0].task_id as number);
}

export async function dbDeleteTaskAttachment(attachmentId: number): Promise<boolean> {
  const result: QueryResult = await pool.query(`DELETE FROM task_attachments WHERE id = $1 RETURNING id`, [
    attachmentId,
  ]);
  return (result.rowCount ?? 0) > 0;
}
