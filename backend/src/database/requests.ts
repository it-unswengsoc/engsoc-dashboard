import { PoolClient, QueryResult } from 'pg';
import type { RequestRecord } from '../functions/requests';
import pool from './pool';

/* One row per request, with the requester and handler joined in, the
   request's task (the one created when it was accepted) and that task's
   assignees, and its attachments' metadata. Attachment bytes are never
   selected here — see dbGetRequestAttachment. */
const REQUEST_SELECT = `
  SELECT r.id, r.request_type, r.title, r.target_port, r.form_data, r.status, r.is_anonymous,
         r.needed_by, r.notes, r.rejection_reason, r.created_at, r.updated_at, r.resolved_at,
         r.requester_id, rq.first_name AS requester_first_name, rq.last_name AS requester_last_name,
         rq.port AS requester_port,
         r.handled_by, hb.first_name AS handled_by_first_name, hb.last_name AS handled_by_last_name,
         t.id AS task_id,
         COALESCE(
           (SELECT json_agg(json_build_object('id', u.id, 'firstName', u.first_name, 'lastName', u.last_name, 'port', u.port)
                            ORDER BY u.first_name, u.last_name)
            FROM task_assignees ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.task_id = t.id),
           '[]'
         ) AS assignees,
         COALESCE(
           (SELECT json_agg(json_build_object('id', a.id, 'fieldName', a.field_name, 'fileName', a.file_name,
                                              'mimeType', a.mime_type, 'sizeBytes', a.size_bytes)
                            ORDER BY a.id)
            FROM request_attachments a
            WHERE a.request_id = r.id),
           '[]'
         ) AS attachments
  FROM requests r
  LEFT JOIN users rq ON rq.id = r.requester_id
  LEFT JOIN users hb ON hb.id = r.handled_by
  LEFT JOIN LATERAL (SELECT id FROM tasks WHERE request_id = r.id ORDER BY id DESC LIMIT 1) t ON true
`;

const REQUEST_ORDER = 'ORDER BY r.created_at DESC';

function fullName(first: string | null, last: string | null): string | null {
  return first ? `${first} ${last}` : null;
}

function rowToRequest(row: any): RequestRecord {
  return {
    id: row.id,
    requestType: row.request_type,
    title: row.title,
    targetPort: row.target_port,
    formData: row.form_data ?? {},
    status: row.status,
    isAnonymous: row.is_anonymous ?? false,
    neededBy: row.needed_by,
    notes: row.notes,
    rejectionReason: row.rejection_reason,
    requesterId: row.requester_id,
    requesterName: fullName(row.requester_first_name, row.requester_last_name),
    requesterPort: row.requester_port,
    handledBy: row.handled_by,
    handledByName: fullName(row.handled_by_first_name, row.handled_by_last_name),
    taskId: row.task_id,
    assignees: row.assignees.map((a: any) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`, port: a.port })),
    attachments: row.attachments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

/** Every request of the given types, newest first — a port's incoming list. */
export async function dbGetRequestsOfTypes(requestTypes: string[]): Promise<RequestRecord[]> {
  if (requestTypes.length === 0) return [];
  const result: QueryResult = await pool.query(
    `${REQUEST_SELECT} WHERE r.request_type = ANY($1) ${REQUEST_ORDER}`,
    [requestTypes]
  );
  return result.rows.map(rowToRequest);
}

/** Every request the user submitted, newest first. */
export async function dbGetRequestsByRequester(userId: number): Promise<RequestRecord[]> {
  const result: QueryResult = await pool.query(
    `${REQUEST_SELECT} WHERE r.requester_id = $1 ${REQUEST_ORDER}`,
    [userId]
  );
  return result.rows.map(rowToRequest);
}

export async function dbGetRequestById(requestId: number): Promise<RequestRecord | null> {
  const result: QueryResult = await pool.query(`${REQUEST_SELECT} WHERE r.id = $1`, [requestId]);
  return result.rows[0] ? rowToRequest(result.rows[0]) : null;
}

export interface NewAttachment {
  fieldName: string;
  fileName: string;
  mimeType: string;
  data: Buffer;
}

/** Inserts a request and its attachments together. */
export async function dbCreateRequest(input: {
  requesterId: number;
  targetPort: string;
  requestType: string;
  title: string;
  formData: Record<string, unknown>;
  isAnonymous: boolean;
  neededBy: string | null;
  attachments: NewAttachment[];
}): Promise<RequestRecord | null> {
  const requestId = await inTransaction(async (client) => {
    const result: QueryResult = await client.query(
      `INSERT INTO requests
         (requester_id, target_port, request_type, title, form_data, is_anonymous, needed_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      [
        input.requesterId,
        input.targetPort,
        input.requestType,
        input.title,
        JSON.stringify(input.formData),
        input.isAnonymous,
        input.neededBy,
      ]
    );
    const id: number = result.rows[0].id;
    for (const attachment of input.attachments) {
      await client.query(
        `INSERT INTO request_attachments (request_id, field_name, file_name, mime_type, size_bytes, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, attachment.fieldName, attachment.fileName, attachment.mimeType, attachment.data.length, attachment.data]
      );
    }
    return id;
  });
  return dbGetRequestById(requestId);
}

/** Thrown when a request has already moved on from the status an action expects. */
export class RequestStatusConflictError extends Error {}

/**
 * Accepts a pending request: moves it to in_progress, records who accepted
 * it and their notes, and (when `task` is given) creates its task for the
 * chosen assignees — all or nothing. The status check is part of the update
 * itself, so two people accepting at once can't both succeed.
 */
export async function dbAcceptRequest(input: {
  requestId: number;
  handledBy: number;
  notes: string | null;
  task: { title: string; description: string | null; dueDate: string | null; assigneeIds: number[] } | null;
}): Promise<RequestRecord | null> {
  await inTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE requests
       SET status = 'in_progress', handled_by = $2, notes = $3, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [input.requestId, input.handledBy, input.notes]
    );
    if (updated.rowCount === 0) throw new RequestStatusConflictError('Only a pending request can be accepted');

    if (input.task) {
      const created = await client.query(
        `INSERT INTO tasks (title, description, assigned_by, due_date, request_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [input.task.title, input.task.description, input.handledBy, input.task.dueDate, input.requestId]
      );
      await client.query(
        `INSERT INTO task_assignees (task_id, user_id) SELECT $1, unnest($2::int[])`,
        [created.rows[0].id, input.task.assigneeIds]
      );
    }
  });
  return dbGetRequestById(input.requestId);
}

/** Replaces who's on a request's task. */
export async function dbSetTaskAssignees(taskId: number, assigneeIds: number[]): Promise<void> {
  await inTransaction(async (client) => {
    await client.query(`DELETE FROM task_assignees WHERE task_id = $1 AND NOT (user_id = ANY($2::int[]))`, [
      taskId,
      assigneeIds,
    ]);
    await client.query(
      `INSERT INTO task_assignees (task_id, user_id) SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
      [taskId, assigneeIds]
    );
    await client.query(`UPDATE tasks SET updated_at = NOW() WHERE id = $1`, [taskId]);
  });
}

/**
 * Rejects a pending or in-progress request with a reason, and cancels its
 * task if it has one, so the work drops off everyone's list.
 */
export async function dbRejectRequest(requestId: number, handledBy: number, reason: string): Promise<RequestRecord | null> {
  await inTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE requests
       SET status = 'rejected', rejection_reason = $3, handled_by = COALESCE(handled_by, $2),
           resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status IN ('pending', 'in_progress')
       RETURNING id`,
      [requestId, handledBy, reason]
    );
    if (updated.rowCount === 0) {
      throw new RequestStatusConflictError('Only a pending or in-progress request can be rejected');
    }
    await client.query(
      `UPDATE tasks SET status = 'cancelled', updated_at = NOW()
       WHERE request_id = $1 AND status <> 'completed'`,
      [requestId]
    );
  });
  return dbGetRequestById(requestId);
}

/** Completes an in-progress request, and its task along with it. */
export async function dbCompleteRequest(requestId: number): Promise<RequestRecord | null> {
  await inTransaction(async (client) => {
    const updated = await client.query(
      `UPDATE requests SET status = 'completed', resolved_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND status = 'in_progress'
       RETURNING id`,
      [requestId]
    );
    if (updated.rowCount === 0) throw new RequestStatusConflictError('Only an in-progress request can be completed');
    await client.query(
      `UPDATE tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE request_id = $1 AND status NOT IN ('completed', 'cancelled')`,
      [requestId]
    );
  });
  return dbGetRequestById(requestId);
}

/** One attachment's bytes, only if it belongs to that request. */
export async function dbGetRequestAttachment(
  requestId: number,
  attachmentId: number
): Promise<{ fileName: string; mimeType: string; data: Buffer } | null> {
  const result: QueryResult = await pool.query(
    `SELECT file_name, mime_type, data FROM request_attachments WHERE id = $1 AND request_id = $2`,
    [attachmentId, requestId]
  );
  const row = result.rows[0];
  return row ? { fileName: row.file_name, mimeType: row.mime_type, data: row.data } : null;
}

/** The fields request access checks need about the person asking. */
export async function dbGetRequestViewer(
  userId: number
): Promise<{ id: number; role: string; port: string | null; isTreasurer: boolean; name: string } | null> {
  const result: QueryResult = await pool.query(
    `SELECT id, role, port, is_treasurer, first_name, last_name FROM users WHERE id = $1 AND is_active = true`,
    [userId]
  );
  const row = result.rows[0];
  return row
    ? { id: row.id, role: row.role, port: row.port, isTreasurer: row.is_treasurer, name: `${row.first_name} ${row.last_name}` }
    : null;
}

/** The active treasurer, if there is one (at most one, by the one_treasurer index). */
export async function dbGetTreasurerIds(): Promise<number[]> {
  const result: QueryResult = await pool.query(`SELECT id FROM users WHERE is_active = true AND is_treasurer`);
  return result.rows.map((row) => row.id);
}

/** Active members of a port holding one of the given roles. */
export async function dbGetPortMemberIds(port: string, roles?: string[]): Promise<number[]> {
  const result: QueryResult = await pool.query(
    `SELECT id FROM users
     WHERE is_active = true AND port = $1 AND ($2::text[] IS NULL OR role::text = ANY($2::text[]))`,
    [port, roles ?? null]
  );
  return result.rows.map((row) => row.id);
}

async function inTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

