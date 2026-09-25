import { Pool } from 'pg';
import { dbGetTasksForUser, dbGetTaskById, dbCreateTask, dbUpdateTaskStatus } from '../database/tasks';
import { listDirectoryUsers } from './users';
import { createNotificationsBulk } from './notifications';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  assignedBy: number | null;
  assignedByName: string | null;
  assignedTo: number;
  assignedToName: string | null;
  eventId: number | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type AssignTarget = 'me' | 'port' | 'person';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  assignTo: AssignTarget;
  port?: string; // required when assignTo === 'port'
  assigneeId?: number; // required when assignTo === 'person'
  requestedBy: number;
}

/** Thrown when a member tries to update a task that isn't assigned to them. */
export class ForbiddenTaskError extends Error {}

/**
 * Retrieves every task assigned to a user, soonest due date first (no due
 * date sorts last) — backs the dashboard's "My tasks" widget.
 */
export async function getTasksForUser(userId: number): Promise<Task[]> {
  try {
    return await dbGetTasksForUser(userId);
  } catch (error) {
    console.error('Get tasks for user error:', error);
    return [];
  }
}

/**
 * Creates a task. `assignTo` decides who ends up with it:
 *   - 'me': the requester self-assigns
 *   - 'person': one specific member, by id (resolved from the directory —
 *     see routes/users.ts — on the frontend's assignee picker)
 *   - 'port': every member currently holding that portfolio. The tasks
 *     table ties assigned_to to exactly one user (see
 *     database/create-tables.sql), so "assign to a port" fans out into one
 *     task row per member of it rather than a single shared row — the same
 *     outcome as assigning the same task to each of them individually.
 *
 * Each resulting assignee (other than the requester themself, who doesn't
 * need telling about their own self-assigned task) gets a notification,
 * best-effort.
 */
export async function createTasks(input: CreateTaskRequest): Promise<Task[]> {
  const title = input.title?.trim();
  if (!title) throw new Error('Title is required');
  if (title.length > 255) throw new Error('Title must be 255 characters or fewer');
  if (input.dueDate !== undefined && isNaN(new Date(input.dueDate).getTime())) {
    throw new Error('Due date must be a valid date');
  }

  let assigneeIds: number[];
  if (input.assignTo === 'me') {
    assigneeIds = [input.requestedBy];
  } else if (input.assignTo === 'port') {
    if (!input.port) throw new Error('A portfolio is required when assigning to a port');
    const directory = await listDirectoryUsers();
    assigneeIds = directory.filter((u) => u.port === input.port).map((u) => u.id);
    if (assigneeIds.length === 0) throw new Error('No members currently hold that portfolio');
  } else if (input.assignTo === 'person') {
    if (!input.assigneeId) throw new Error('A person is required when assigning to a person');
    assigneeIds = [input.assigneeId];
  } else {
    throw new Error('assignTo must be one of: me, port, person');
  }

  const created: Task[] = [];
  for (const assignedTo of assigneeIds) {
    const task = await dbCreateTask({
      title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      assignedBy: input.requestedBy,
      assignedTo,
    });
    if (task) created.push(task);
  }

  const notifyInputs = created
    .filter((t) => t.assignedTo !== input.requestedBy)
    .map((t) => ({
      userId: t.assignedTo,
      taskId: t.id,
      type: 'task' as const,
      title: `New task assigned: ${t.title}`,
      message: t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : undefined,
    }));
  if (notifyInputs.length > 0) {
    await createNotificationsBulk(notifyInputs);
  }

  return created;
}

/**
 * Updates a task's status — checking it off, or moving it in/out of
 * progress. Only the assignee can update their own task; throws
 * ForbiddenTaskError otherwise (caught by the route as a 403). Sets
 * completed_at when the new status is 'completed', clears it otherwise.
 * Returns null if the task doesn't exist.
 */
export async function updateTaskStatus(taskId: number, userId: number, status: TaskStatus): Promise<Task | null> {
  const existing = await dbGetTaskById(taskId);
  if (!existing) return null;
  if (existing.assignedTo !== userId) {
    throw new ForbiddenTaskError('You can only update your own tasks');
  }
  return dbUpdateTaskStatus(taskId, status);
}

export default pool;
