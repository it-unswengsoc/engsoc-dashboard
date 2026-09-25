import type { TaskItem } from '@/types/tasks';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { TaskItem };

/* Shape the backend actually returns (backend/src/functions/tasks.ts's Task
   interface) — mapped to TaskItem below, same pattern as events-api.ts. */
interface RawTask {
  id: number;
  title: string;
  dueDate: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

function toTaskItem(raw: RawTask): TaskItem {
  return {
    id: raw.id,
    name: raw.title,
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
