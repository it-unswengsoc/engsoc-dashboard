import { getEvents } from '@/services/events-api';
import { getTasks } from '@/services/tasks-api';
import { getAnnouncements } from '@/services/announcements-api';
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
  const d = new Date(task.dueAt);
  return {
    id: task.id,
    daysTillDue: daysUntil(d),
    name: task.name,
    dateString: toLongDate(d),
    time: toTime(d, true),
  };
}

/* ---------- Dashboard-shaped getters ---------- */

/* Soonest first, capped so the sidebar card doesn't blow out */
export async function getUpcomingEvents(limit = 3): Promise<EventRowData[]> {
  const events = await getEvents();
  const now = Date.now();
  return events
    .filter((e) => new Date(e.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, limit)
    .map(toEventRow);
}

/* Incomplete tasks, most urgent first */
export async function getOpenTasks(limit = 3): Promise<TaskRowData[]> {
  const tasks = await getTasks();
  return tasks
    .filter((t) => !t.completed)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit)
    .map(toTaskRow);
}

/* Newest first */
export async function getRecentAnnouncements(): Promise<AnnouncementItem[]> {
  const announcements = await getAnnouncements();
  return announcements
    .slice()
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [tasks, events, announcements] = await Promise.all([
    getTasks(),
    getEvents(),
    getAnnouncements(),
  ]);

  const open = tasks.filter((t) => !t.completed).length;
  const unread = announcements.filter((a) => !a.read).length;

  return {
    openTasks: `${open}/${tasks.length}`,
    upcomingEvents: String(events.length),
    newAnnouncements: String(unread),
  };
}
