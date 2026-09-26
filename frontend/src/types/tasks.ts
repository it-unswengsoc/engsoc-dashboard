import type { Member } from '@/types/members';

/* What the dashboard's "My tasks" panel and the calendar render. Deliberately
   thin — those two only need a name, a due date and a tick. */
export interface TaskItem {
  id: number;
  name: string;
  dueAt: string; // ISO date string
  completed: boolean;
}

/* ---------- Board shape ---------- */

/* Matches the task_status enum in database/create-tables.sql. */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/* The fuller row the board needs, mirroring the tasks table. `port` is the
   exception — the table has no such column, so a port-wide board isn't
   representable server-side yet; it'd need `port port_type` adding. */
export interface BoardTask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo: Member;
  assignedBy?: Member;
  port: string;
  dueAt?: string;
  /* Set when the task came from a request, so the board can point back at it.
     Needs tasks.request_id, which doesn't exist yet either. */
  requestTitle?: string;
}
