import type { EventItem, EventType } from '@/types/events';
import type { TaskItem } from '@/types/tasks';
import type { AnnouncementItem } from '@/types/announcements';
import type { EventRowData, TaskRowData, DashboardStats } from '@/types/dashboard';

export type { EventItem, EventType, TaskItem, AnnouncementItem };
export type { EventRowData, TaskRowData, DashboardStats };

/* ---------- Date helpers ---------- */

const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* "21/08/26" */
function toSlashDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/* "Mon, 1 June" */
function toLongDate(d: Date): string {
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
}

/* "9:30pm" / "9:30PM" */
function toTime(d: Date, upper = false): string {
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes}${upper ? suffix.toUpperCase() : suffix}`;
}

/* Whole calendar days between today and the given date (negative = overdue) */
function daysUntil(d: Date, now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/* ---------- Mappers: raw -> row props ---------- */

export function toEventRow(event: EventItem): EventRowData {
  const d = new Date(event.startsAt);
  return {
    id: event.id,
    month: MONTHS_SHORT[d.getMonth()],
    day: d.getDate(),
    name: event.name,
    type: event.type,
    dateString: toSlashDate(d),
    time: toTime(d),
  };
}

export function toTaskRow(task: TaskItem): TaskRowData {
  if (task.dueAt === null) {
    return { id: task.id, daysTillDue: null, name: task.name, dateString: '', time: '' };
  }
  const d = new Date(task.dueAt);
  return {
    id: task.id,
    daysTillDue: daysUntil(d),
    name: task.name,
    dateString: toLongDate(d),
    time: toTime(d, true),
  };
}

/* ---------- Dashboard-shaped getters ----------
   Tasks and announcements now carry per-user data (whose task it is,
   whether *I* liked this) — both need the signed-in member's own token,
   which only exists in the browser (sessionStorage), so these can't run in
   a Server Component the way events still can. The dashboard page fetches
   all three itself, client-side, and calls the mappers below directly. */

/* Soonest first, capped so the query doesn't grow unbounded — the panel scrolls past the cap */
export function toUpcomingEventRows(events: EventItem[], limit = 3): EventRowData[] {
  const now = Date.now();
  return events
    .filter((e) => new Date(e.startsAt).getTime() >= now)
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit)
    .map(toEventRow);
}

/* Incomplete tasks, most urgent first — no due date sorts last. */
export function toOpenTaskRows(tasks: TaskItem[], limit = 3): TaskRowData[] {
  return tasks
    .filter((t) => !t.completed)
    .slice()
    .sort((a, b) => {
      const at = a.dueAt === null ? Infinity : new Date(a.dueAt).getTime();
      const bt = b.dueAt === null ? Infinity : new Date(b.dueAt).getTime();
      return at - bt;
    })
    .slice(0, limit)
    .map(toTaskRow);
}

/* Newest first */
export function toRecentAnnouncements(announcements: AnnouncementItem[]): AnnouncementItem[] {
  return announcements.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/* "New" announcements = posted in the last 7 days — announcements
   themselves have no per-user read state the way notifications do, so this
   is a simple recency window rather than an unread count. */
const NEW_ANNOUNCEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function toDashboardStats(tasks: TaskItem[], events: EventItem[], announcements: AnnouncementItem[]): DashboardStats {
  const open = tasks.filter((t) => !t.completed).length;
  const now = Date.now();
  const recent = announcements.filter((a) => now - new Date(a.createdAt).getTime() < NEW_ANNOUNCEMENT_WINDOW_MS).length;

  return {
    openTasks: `${open}/${tasks.length}`,
    upcomingEvents: String(events.filter((e) => new Date(e.startsAt).getTime() >= now).length),
    newAnnouncements: String(recent),
  };
}
