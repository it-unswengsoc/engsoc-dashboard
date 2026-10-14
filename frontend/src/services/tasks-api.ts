import type { BoardTask, TaskAssignee, TaskItem, TaskStatus } from '@/types/tasks';
import { USE_MOCK } from '@/services/api-config';
import { api, apiFetch } from '@/services/api-client';

export type { BoardTask, TaskItem, TaskStatus };

/* Shape the backend actually returns (backend/src/functions/tasks.ts's Task
   interface) — mapped to TaskItem below, same pattern as events-api.ts. */
export interface RawTask {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: TaskStatus;
  assignedBy: number | null;
  assignedByName: string | null;
  assignees: TaskAssignee[];
  requestId?: number | null;
  requestTitle?: string | null;
  requestType?: string | null;
  requesterName?: string | null;
}

export function toTaskItem(raw: RawTask): TaskItem {
  return {
    id: raw.id,
    name: raw.title,
    description: raw.description,
    dueAt: raw.dueDate,
    completed: raw.status === 'completed',
    status: raw.status,
  };
}

function stripRequestPrefix(description: string | null): string | null {
  if (!description) return description;
  const rest = description.replace(/^[^\n]* (request|Grievance) from [^\n]+\.(\n\n|$)/, '').trim();
  return rest || null;
}

function toBoardTask(raw: RawTask): BoardTask {
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    assignees: raw.assignees,
    assignedBy: raw.assignedBy !== null && raw.assignedByName ? { id: raw.assignedBy, name: raw.assignedByName } : null,
    dueAt: raw.dueDate,
    requestId: raw.requestId ?? undefined,
    requestTitle: raw.requestTitle ?? undefined,
    requestType: raw.requestType ?? undefined,
    requesterName: raw.requesterName ?? undefined,
    // Tasks accepted before the request's type and requester came with the
    // task had them written as the description's first line ("Mass email
    // request from Winnie Moy."); the dialog shows those as a pill now.
    description: raw.requestId ? stripRequestPrefix(raw.description) : raw.description,
  };
}

/* Needs the signed-in member's own token — GET /tasks/mine is scoped to
   whoever's asking, there's no "all tasks" view. Cancelled tasks are left
   out: TaskItem only knows done or not, so one would otherwise show as open
   (and overdue) on the dashboard and calendar, where ticking it would
   un-cancel it. */
export async function getTasks(token: string): Promise<TaskItem[]> {
  if (USE_MOCK) {
    const { getTasks: mockGetTasks } = await import('@/mocks/functions/tasks');
    return mockGetTasks();
  }

  const data = await api<RawTask[]>('/tasks/mine', { token, errorMessage: 'Failed to load tasks' });
  return data.filter((raw) => raw.status !== 'cancelled').map(toTaskItem);
}

/* Backs the task detail dialog — assignee or admin only (backend 403s
   otherwise). */
export async function getTask(token: string, taskId: number): Promise<TaskItem> {
  if (USE_MOCK) {
    const { getTask: mockGetTask } = await import('@/mocks/functions/tasks');
    return mockGetTask(taskId);
  }

  return toTaskItem(await api<RawTask>(`/tasks/${taskId}`, { token, errorMessage: 'Failed to load task' }));
}

/* The same task in the board's shape — lets the dashboard open the board's
   dialog. Assignees, whoever created it, and admins only. */
export async function getBoardTask(token: string, taskId: number): Promise<BoardTask> {
  if (USE_MOCK) {
    const { getBoardTask: mockGetBoardTask } = await import('@/mocks/functions/tasks');
    return mockGetBoardTask(taskId);
  }

  return toBoardTask(await api<RawTask>(`/tasks/${taskId}`, { token, errorMessage: 'Failed to load task' }));
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string; // ISO date string
  assignTo: 'me' | 'port' | 'person';
  port?: string; // required when assignTo === 'port'
  assigneeIds?: number[]; // one or more, required when assignTo === 'person'
}

/* Always one shared task, whoever it's assigned to — the backend still
   answers with an array from when a port fanned out into one task per
   member. */
export async function createTask(token: string, input: CreateTaskInput): Promise<TaskItem[]> {
  if (USE_MOCK) {
    const { createTask: mockCreateTask } = await import('@/mocks/functions/tasks');
    return mockCreateTask(input);
  }

  const data = await api<RawTask[]>('/tasks', {
    method: 'POST',
    token,
    body: input,
    errorMessage: 'Failed to create task',
  });
  return data.map(toTaskItem);
}

/* Any of the task's assignees can move it, to any status — the backend 403s
   anyone else (see backend/src/functions/tasks.ts's ForbiddenTaskError). */
export async function updateTaskStatus(token: string, taskId: number, status: TaskStatus): Promise<TaskItem> {
  if (USE_MOCK) {
    const { updateTaskStatus: mockUpdateTaskStatus } = await import('@/mocks/functions/tasks');
    return mockUpdateTaskStatus(taskId, status);
  }

  return toTaskItem(
    await api<RawTask>(`/tasks/${taskId}`, {
      method: 'PATCH',
      token,
      body: { status },
      errorMessage: 'Failed to update task',
    }),
  );
}

export interface TaskDetailsEdit {
  title: string;
  description: string | null;
  dueDate: string | null; // ISO date string; null clears it
}

/* Only whoever created the task can edit it — the backend 403s anyone
   else. */
export async function updateTaskDetails(token: string, taskId: number, edit: TaskDetailsEdit): Promise<BoardTask> {
  if (USE_MOCK) {
    const { updateTaskDetails: mockUpdateTaskDetails } = await import('@/mocks/functions/tasks');
    return mockUpdateTaskDetails(taskId, edit);
  }

  return toBoardTask(
    await api<RawTask>(`/tasks/${taskId}`, { method: 'PATCH', token, body: edit, errorMessage: 'Failed to save task' }),
  );
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

  return api<RawTaskAttachment[]>(`/tasks/${taskId}/attachments`, {
    token,
    errorMessage: 'Failed to load attachments',
  });
}

export async function addTaskAttachment(
  token: string,
  taskId: number,
  input: { driveFileId: string; name: string; webViewLink: string | null; mimeType: string | null },
): Promise<TaskAttachment> {
  if (USE_MOCK) {
    const { addTaskAttachment: mockAddTaskAttachment } = await import('@/mocks/functions/task-attachments');
    return mockAddTaskAttachment(taskId, input);
  }

  return api<RawTaskAttachment>(`/tasks/${taskId}/attachments`, {
    method: 'POST',
    token,
    body: input,
    errorMessage: 'Failed to add attachment',
  });
}

export async function deleteTaskAttachment(token: string, taskId: number, attachmentId: number): Promise<void> {
  if (USE_MOCK) {
    const { deleteTaskAttachment: mockDeleteTaskAttachment } = await import('@/mocks/functions/task-attachments');
    return mockDeleteTaskAttachment(attachmentId);
  }

  await apiFetch(`/tasks/${taskId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    token,
    errorMessage: 'Failed to remove attachment',
  });
}

/* A port's board: every task with at least one assignee currently in that
   port. Port members and admins only — the backend 403s anyone else. */
export async function getBoardTasks(token: string, port: string): Promise<BoardTask[]> {
  if (USE_MOCK) {
    const { getBoardTasks: mockGetBoardTasks } = await import('@/mocks/functions/tasks');
    return mockGetBoardTasks(port);
  }

  const data = await api<RawTask[]>(`/tasks?port=${encodeURIComponent(port)}`, {
    token,
    errorMessage: 'Failed to load tasks',
  });
  return data.map(toBoardTask);
}
