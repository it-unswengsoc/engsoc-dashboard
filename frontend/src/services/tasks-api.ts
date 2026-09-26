import type { BoardTask, TaskItem } from '@/types/tasks';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { BoardTask, TaskItem };

/* Shape the backend actually returns (backend/src/functions/tasks.ts's Task
   interface) — mapped to TaskItem below, same pattern as events-api.ts. */
interface RawTask {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

function toTaskItem(raw: RawTask): TaskItem {
  return {
    id: raw.id,
    name: raw.title,
    description: raw.description,
    dueAt: raw.dueDate,
    completed: raw.status === 'completed',
  };
}

/* Needs the signed-in member's own token — GET /tasks/mine is scoped to
   whoever's asking, there's no "all tasks" view. */
export async function getTasks(token: string): Promise<TaskItem[]> {
  if (USE_MOCK) {
    const { getTasks: mockGetTasks } = await import('@/mocks/functions/tasks');
    return mockGetTasks();
  }

  const res = await fetch(apiUrl('/tasks/mine'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load tasks');
  return (data.data as RawTask[]).map(toTaskItem);
}

/* Backs the task detail dialog — assignee or admin only (backend 403s
   otherwise). */
export async function getTask(token: string, taskId: number): Promise<TaskItem> {
  if (USE_MOCK) {
    const { getTask: mockGetTask } = await import('@/mocks/functions/tasks');
    return mockGetTask(taskId);
  }

  const res = await fetch(apiUrl(`/tasks/${taskId}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load task');
  return toTaskItem(data.data as RawTask);
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string; // ISO date string
  assignTo: 'me' | 'port' | 'person';
  port?: string; // required when assignTo === 'port'
  assigneeId?: number; // required when assignTo === 'person'
}

/* 'port' fans out to one task per member of that portfolio server-side (see
   backend/src/functions/tasks.ts) — the array returned here can have more
   than one row for that case. */
export async function createTask(token: string, input: CreateTaskInput): Promise<TaskItem[]> {
  if (USE_MOCK) {
    const { createTask: mockCreateTask } = await import('@/mocks/functions/tasks');
    return mockCreateTask(input);
  }

  const res = await fetch(apiUrl('/tasks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create task');
  return (data.data as RawTask[]).map(toTaskItem);
}

/* Only the assignee can update their own task — the backend 403s anyone
   else (see backend/src/functions/tasks.ts's ForbiddenTaskError). */
export async function updateTaskStatus(
  token: string,
  taskId: number,
  status: 'pending' | 'completed'
): Promise<TaskItem> {
  if (USE_MOCK) {
    const { updateTaskStatus: mockUpdateTaskStatus } = await import('@/mocks/functions/tasks');
    return mockUpdateTaskStatus(taskId, status);
  }

  const res = await fetch(apiUrl(`/tasks/${taskId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update task');
  return toTaskItem(data.data as RawTask);
}

/* The file's bytes are never sent here — see documents-api.ts's
   uploadDriveFile, which the task detail dialog calls first to actually
   upload to Drive, then records the result with this. */
export interface TaskAttachment {
  id: number;
  driveFileId: string;
  name: string;
  webViewLink: string | null;
  mimeType: string | null;
  createdAt: string;
}

interface RawTaskAttachment {
  id: number;
  driveFileId: string;
  name: string;
  webViewLink: string | null;
  mimeType: string | null;
  createdAt: string;
}

export async function getTaskAttachments(token: string, taskId: number): Promise<TaskAttachment[]> {
  if (USE_MOCK) {
    const { getTaskAttachments: mockGetTaskAttachments } = await import('@/mocks/functions/task-attachments');
    return mockGetTaskAttachments(taskId);
  }

  const res = await fetch(apiUrl(`/tasks/${taskId}/attachments`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load attachments');
  return data.data as RawTaskAttachment[];
}

export async function addTaskAttachment(
  token: string,
  taskId: number,
  input: { driveFileId: string; name: string; webViewLink: string | null; mimeType: string | null }
): Promise<TaskAttachment> {
  if (USE_MOCK) {
    const { addTaskAttachment: mockAddTaskAttachment } = await import('@/mocks/functions/task-attachments');
    return mockAddTaskAttachment(taskId, input);
  }

  const res = await fetch(apiUrl(`/tasks/${taskId}/attachments`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add attachment');
  return data.data as RawTaskAttachment;
}

export async function deleteTaskAttachment(token: string, taskId: number, attachmentId: number): Promise<void> {
  if (USE_MOCK) {
    const { deleteTaskAttachment: mockDeleteTaskAttachment } = await import('@/mocks/functions/task-attachments');
    return mockDeleteTaskAttachment(attachmentId);
  }

  const res = await fetch(apiUrl(`/tasks/${taskId}/attachments/${attachmentId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to remove attachment');
  }
}

/* The board's fuller rows, for one port. Always mock for now: GET /tasks/mine
   is scoped to the caller, and there's no port-wide query yet — the tasks
   table has no port column, and a port-assigned task fans out into one row
   per member (see backend/src/functions/tasks.ts), so a board over those
   rows would show the same task once per assignee.

   Going real means, in a later PR:
     - backend: GET /tasks?port=… (plus a port column, or grouping the
       fanned-out rows back into one card)
     - here: a `token` param, the USE_MOCK branch like getTasks, and a
       toBoardTask(raw) mapper beside toTaskItem — RawTask already carries
       status and assignee/assigner ids and names
     - the tasks page: a client component, since the token lives in
       sessionStorage
   The `port` param is already the seam, so callers won't change shape. */
export async function getBoardTasks(port: string): Promise<BoardTask[]> {
  const { getBoardTasks: mockGetBoardTasks } = await import('@/mocks/functions/tasks');
  return mockGetBoardTasks(port);
}
