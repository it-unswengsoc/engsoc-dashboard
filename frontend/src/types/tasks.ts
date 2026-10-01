/* What the dashboard's "My tasks" panel and the calendar render. Deliberately
   thin — those two only need a name, a due date and a tick. */
export interface TaskItem {
  id: number;
  name: string;
  description: string | null;
  dueAt: string | null; // ISO date string; null if no due date was set
  completed: boolean;
  status: TaskStatus; // the board's column; `completed` is status === 'completed'
}

/* ---------- Board shape ---------- */

/* Matches the task_status enum in database/create-tables.sql. */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/* Someone a task is assigned to. `port` is theirs as it is now — it's what
   puts the task on a port's board (see backend/src/database/tasks.ts). */
export interface TaskAssignee {
  id: number;
  name: string;
  port: string | null;
}

/* The fuller row the board needs. A task is one shared card: any of its
   assignees can move it, and it moves for all of them. */
export interface BoardTask {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignees: TaskAssignee[];
  assignedBy: { id: number; name: string } | null;
  dueAt: string | null; // ISO date string
  /* Set when the task came from accepting a request, so the board can point
     back at it (and its dialog can load the request). */
  requestId?: number;
  requestTitle?: string;
  requestType?: string;
  /* Who sent the request — absent for an anonymous one. */
  requesterName?: string;
}
