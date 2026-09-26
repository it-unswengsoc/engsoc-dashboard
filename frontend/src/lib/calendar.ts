import type { EventType } from '@/types/events';
import type { TaskItem } from '@/types/tasks';
import type { UserCalendarEvent } from '@/services/user-calendar-api';

/* Dispatched on window after an event is created elsewhere in the app (see
   NewItemDialog) — CalendarShell listens for it to refetch the signed-in
   member's Google Calendar without needing a full page reload. */
export const CALENDAR_EVENTS_CHANGED_EVENT = 'engsoc:calendar-events-changed';

export type CalendarItem =
  | {
      kind: 'event';
      id: string;
      name: string;
      start: Date;
      end: Date | null; // null = no set duration, treated as a single point same-day as start
      allDay: boolean;
      type: EventType;
      location: string | null;
      description: string | null;
      // 'shared' = an official EngSoc event (Postgres-backed, mirrored to the
      // shared calendar); 'personal' = anything else in the member's own
      // Google Calendar, including ones created through this app's
      // drag-to-create for members without shared-event permission.
      source: 'shared' | 'personal';
      // Whether the signed-in member can edit/delete this specific item
      // through the app — computed server-side (organizer-or-admin for
      // shared events; calendar ownership for personal ones).
      canEdit: boolean;
      // Shared events only: the Postgres events.id, for routing an edit to
      // PUT /events/:id. Personal events only: the raw Google event id, for
      // routing an edit/delete to PUT|DELETE /calendar/events/:id.
      officialEventId: number | null;
      googleEventId: string | null;
    }
  | { kind: 'task'; id: string; name: string; start: Date; daysTillDue: number };

export function toTaskCalendarItems(tasks: TaskItem[]): CalendarItem[] {
  return tasks
    // A task with no due date has no date to place it on — leave it off
    // the grid (it still shows in the "Due tasks" list, just undated there).
    .filter((t): t is TaskItem & { dueAt: string } => !t.completed && t.dueAt !== null)
    .map((t) => ({
      kind: 'task',
      id: `task-${t.id}`,
      name: t.name,
      start: new Date(t.dueAt),
      daysTillDue: daysBetween(new Date(), new Date(t.dueAt)),
    }));
}

/* Google's all-day event end date is exclusive (the day AFTER the last day
   the event covers) — correct that to the actual last covered day so the
   day-range checks below (itemsOnDay, weekSpans) don't over-count by one. */
function parseEnd(endsAt: string | null, allDay: boolean): Date | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  if (allDay) end.setDate(end.getDate() - 1);
  return end;
}

/* Every calendar the signed-in member can see in their own Google account —
   personal events plus anything they've added, including the shared EngSoc
   calendar once they've subscribed to it themselves (isSharedEngSocEvent
   flags which is which, so it can render like an official EngSoc event). */
export function toGoogleCalendarItems(events: UserCalendarEvent[]): CalendarItem[] {
  return events.map((e) => ({
    kind: 'event',
    id: `gcal-${e.id}`,
    name: e.title,
    start: new Date(e.startsAt),
    end: parseEnd(e.endsAt, e.allDay),
    allDay: e.allDay,
    type: e.isSharedEngSocEvent ? 'INTERNAL' : 'EXTERNAL',
    location: e.location,
    description: e.description,
    source: e.isSharedEngSocEvent ? 'shared' : 'personal',
    canEdit: e.canEdit,
    officialEventId: e.officialEventId,
    googleEventId: e.id,
  }));
}

function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/* Reuses the exact palette EventRow/TaskRow already use, so calendar blocks
   read as the same visual language as the rest of the dashboard. */
export function itemColor(item: CalendarItem): { bg: string; text: string } {
  if (item.kind === 'event') {
    if (item.source === 'personal' && item.canEdit) return { bg: '#DCD3EF', text: '#4A3A7A' };
    return item.type === 'EXTERNAL'
      ? { bg: '#F1C4C9', text: '#8B2E38' }
      : { bg: '#E5E7EB', text: '#374151' };
  }
  if (item.daysTillDue <= 0) return { bg: '#F1C4C9', text: '#8B2E38' };
  if (item.daysTillDue < 7) return { bg: '#F4EFD3', text: '#7A6A2E' };
  return { bg: '#B1C9DC', text: '#2A4A63' };
}

export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const DAYS_MIN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
}

export function addYears(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setFullYear(copy.getFullYear() + n);
  return copy;
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/* 6 rows x 7 cols, Sunday-first, including lead/trail days from adjacent months */
export function getMonthGrid(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/* Date-only day index (ignores time-of-day) — lets two Dates be compared as
   whole calendar days regardless of what time either carries. */
function dayIndex(d: Date): number {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);
}

/* A multi-day event now shows on every day it spans, not just its start
   date — item.end (when present) is compared as a whole calendar day. */
export function itemsOnDay(items: CalendarItem[], day: Date): CalendarItem[] {
  const target = dayIndex(day);
  return items
    .filter((item) => {
      if (item.kind === 'task') return isSameDay(item.start, day);
      const startIdx = dayIndex(item.start);
      const endIdx = item.end ? dayIndex(item.end) : startIdx;
      return startIdx <= target && target <= endIdx;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/* Only events that should render as a spanning bar (Google Calendar's
   month-view convention: any all-day event, or any event genuinely covering
   more than one calendar day) rather than a per-cell pill. */
export function isBarItem(item: CalendarItem): item is Extract<CalendarItem, { kind: 'event' }> {
  if (item.kind !== 'event') return false;
  if (item.allDay) return true;
  return item.end !== null && dayIndex(item.end) !== dayIndex(item.start);
}

export interface WeekSpan {
  item: Extract<CalendarItem, { kind: 'event' }>;
  startCol: number; // 0-6, column within weekDays
  span: number; // number of columns wide
  row: number; // greedy-packed stacking row, for overlapping bars
}

/* For one week's 7 days, lays out every spanning bar-item that overlaps that
   week — clipped to the week's own bounds (a bar can continue into the next
   week's row) and greedily packed into rows so overlapping bars don't
   collide, the same visual idea as Google Calendar's month view. */
export function weekSpans(items: CalendarItem[], weekDays: Date[]): WeekSpan[] {
  const weekStart = dayIndex(weekDays[0]);
  const weekEnd = dayIndex(weekDays[weekDays.length - 1]);

  const candidates = items.filter(isBarItem).filter((item) => {
    const startIdx = dayIndex(item.start);
    const endIdx = item.end ? dayIndex(item.end) : startIdx;
    return startIdx <= weekEnd && endIdx >= weekStart;
  });

  candidates.sort((a, b) => a.start.getTime() - b.start.getTime());

  const rows: Array<{ startCol: number; span: number }[]> = [];
  const spans: WeekSpan[] = [];

  for (const item of candidates) {
    const startIdx = Math.max(dayIndex(item.start), weekStart);
    const endIdx = Math.min(item.end ? dayIndex(item.end) : dayIndex(item.start), weekEnd);
    const startCol = startIdx - weekStart;
    const span = endIdx - startIdx + 1;

    let row = rows.findIndex((r) => r.every((occupied) => startCol >= occupied.startCol + occupied.span || startCol + span <= occupied.startCol));
    if (row === -1) {
      row = rows.length;
      rows.push([]);
    }
    rows[row].push({ startCol, span });
    spans.push({ item, startCol, span, row });
  }

  return spans;
}

export function formatFullDate(d: Date): string {
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(d: Date): string {
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes}${suffix}`;
}

export function formatHourLabel(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${suffix}`;
}
