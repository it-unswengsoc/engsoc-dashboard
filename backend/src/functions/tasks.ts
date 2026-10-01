import {
  dbGetTasksForUser,
  dbGetTasksForPort,
  dbGetTaskById,
  dbIsTaskAssignee,
  dbCreateTask,
  dbUpdateTaskStatus,
  dbUpdateTaskDetails,
} from '../database/tasks';
import { listDirectoryUsers, getUserPort } from './users';
import { createNotificationsBulk } from './notifications';
import { isUserAdmin, USER_PORTFOLIOS } from './admin';
import pool from '../database/pool';


export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

export interface TaskAssignee {
  id: number;
  name: string;
  port: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  assignedBy: number | null;
  assignedByName: string | null;
  assignees: TaskAssignee[];
  eventId: number | null;
  /* The request it was created from by accepting it, if any, and its title
     for the board. The request itself (answers, files) comes from
     GET /requests/:id, under the request's own access rules. */
  requestId: number | null;
  requestTitle: string | null;
  requestType: string | null;
  /* Who sent the request — null for an anonymous one. */
  requesterName: string | null;
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
  assigneeIds?: number[]; // one or more, when assignTo === 'person'
  assigneeId?: number; // single-person form, still accepted from older clients
  requestedBy: number;
}

/** Thrown when a member tries to reach a task they aren't assigned to. */
export class ForbiddenTaskError extends Error {}

/** Thrown for a status outside task_status — the route answers 400. */
export class InvalidTaskStatusError extends Error {}

/** Thrown for an invalid edit (empty title, bad date) — the route answers 400. */
export class InvalidTaskEditError extends Error {}

export interface TaskDetailsEdit {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
}

/**
 * Retrieves every task the user is an assignee on, soonest due date first
 * (no due date sorts last) — backs the dashboard's "My tasks" widget and the
 * board's "My tasks" filter.
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
 * A port's board — every task with at least one assignee in that port.
 * Members of the port and admins only; throws ForbiddenTaskError otherwise
 * (caught by the route as a 403).
 */
export async function getTasksForPort(port: string, userId: number): Promise<Task[]> {
  if (!USER_PORTFOLIOS.includes(port as any)) throw new Error('Unknown portfolio');
  if ((await getUserPort(userId)) !== port && !(await isUserAdmin(userId))) {
    throw new ForbiddenTaskError("You can only view your own port's tasks");
  }
  return dbGetTasksForPort(port);
}

/**
 * Creates one task, shared by everyone it's assigned to. `assignTo` decides
 * who that is:
 *   - 'me': the requester self-assigns
 *   - 'person': one or more specific members, by id (resolved from the
 *     directory — see routes/users.ts — on the frontend's assignee picker)
 *   - 'port': every member currently holding that portfolio, snapshotted
 *     now — someone who joins the port later isn't added
 *
 * Returned as a one-element array: POST /tasks used to fan a port out into
 * one task per member, and the frontend's createTask still reads an array.
 *
 * Each assignee (other than the requester themself, who doesn't need
 * telling about their own task) gets a notification, best-effort.
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
    const requested = input.assigneeIds ?? (input.assigneeId ? [input.assigneeId] : []);
    if (requested.length === 0) throw new Error('At least one person is required when assigning to people');
    const activeIds = new Set((await listDirectoryUsers()).map((u) => u.id));
    if (requested.some((id) => !activeIds.has(id))) throw new Error('Every assignee must be an active member');
    assigneeIds = [...new Set(requested)];
  } else {
    throw new Error('assignTo must be one of: me, port, person');
  }

  const task = await dbCreateTask({
    title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    assignedBy: input.requestedBy,
    assigneeIds,
  });
  if (!task) return [];

  const notifyInputs = task.assignees
    .filter((a) => a.id !== input.requestedBy)
    .map((a) => ({
      userId: a.id,
      taskId: task.id,
      type: 'task' as const,
      title: `New task assigned: ${task.title}`,
      message: task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : undefined,
    }));
  if (notifyInputs.length > 0) {
    await createNotificationsBulk(notifyInputs);
  }

  return [task];
}

/**
 * Moves a task to any task_status — the dashboard checkbox, or a board
 * column. Any of the task's assignees can move it, and it moves for all of
 * them; anyone else gets ForbiddenTaskError (a 403). Sets completed_at when
 * the new status is 'completed', clears it otherwise. Returns null if the
 * task doesn't exist.
 */
export async function updateTaskStatus(taskId: number, userId: number, status: string): Promise<Task | null> {
  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    throw new InvalidTaskStatusError(`status must be one of: ${TASK_STATUSES.join(', ')}`);
  }
  const existing = await dbGetTaskById(taskId);
  if (!existing) return null;
  if (!(await dbIsTaskAssignee(taskId, userId))) {
    throw new ForbiddenTaskError('You can only update tasks assigned to you');
  }
  return dbUpdateTaskStatus(taskId, status as TaskStatus);
}

/**
 * Edits a task's title, description or due date. Only whoever created it
 * (assigned_by) can; anyone else gets ForbiddenTaskError (a 403). Returns
 * null if the task doesn't exist.
 */
export async function updateTaskDetails(taskId: number, userId: number, edit: TaskDetailsEdit): Promise<Task | null> {
  const fields: TaskDetailsEdit = {};
  if (edit.title !== undefined) {
    const title = typeof edit.title === 'string' ? edit.title.trim() : '';
    if (!title) throw new InvalidTaskEditError('Title is required');
    if (title.length > 255) throw new InvalidTaskEditError('Title must be 255 characters or fewer');
    fields.title = title;
  }
  if (edit.description !== undefined) {
    fields.description = typeof edit.description === 'string' ? edit.description.trim() || null : null;
  }
  if (edit.dueDate !== undefined) {
    if (edit.dueDate !== null && (typeof edit.dueDate !== 'string' || isNaN(new Date(edit.dueDate).getTime()))) {
      throw new InvalidTaskEditError('Due date must be a valid date');
    }
    fields.dueDate = edit.dueDate;
  }

  const existing = await dbGetTaskById(taskId);
  if (!existing) return null;
  if (existing.assignedBy !== userId) {
    throw new ForbiddenTaskError('Only the person who created this task can edit it');
  }
  return dbUpdateTaskDetails(taskId, fields);
}

/**
 * Fetches a single task — any of its assignees, whoever created it, or an
 * admin. Throws
 * ForbiddenTaskError if the requester isn't allowed to see it (caught by the
 * route as a 403); returns null if the task doesn't exist at all.
 */
export async function getTaskById(taskId: number, userId: number): Promise<Task | null> {
  const task = await dbGetTaskById(taskId);
  if (!task) return null;
  if (
    !task.assignees.some((a) => a.id === userId) &&
    task.assignedBy !== userId &&
    !(await isUserAdmin(userId))
  ) {
    throw new ForbiddenTaskError('You can only view your own tasks');
  }
  return task;
}
