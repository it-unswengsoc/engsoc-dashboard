import type { EventItem, EventType } from '@/types/events';
import type { TaskItem } from '@/types/tasks';

export type CalendarItem =
  | { kind: 'event'; id: string; name: string; start: Date; type: EventType }
  | { kind: 'task'; id: string; name: string; start: Date; daysTillDue: number };

/* Events/tasks carry no end time yet, so the grid views render every item as
   a fixed-height block positioned by start time only. */

export function toCalendarItems(events: EventItem[], tasks: TaskItem[]): CalendarItem[] {
  const eventItems: CalendarItem[] = events.map((e) => ({
    kind: 'event',
    id: `event-${e.id}`,
    name: e.name,
    start: new Date(e.startsAt),
    type: e.type,
  }));

  const taskItems: CalendarItem[] = tasks
    .filter((t) => !t.completed)
    .map((t) => ({
      kind: 'task',
      id: `task-${t.id}`,
      name: t.name,
      start: new Date(t.dueAt),
      daysTillDue: daysBetween(new Date(), new Date(t.dueAt)),
    }));

  return [...eventItems, ...taskItems];
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

export function itemsOnDay(items: CalendarItem[], day: Date): CalendarItem[] {
  return items
    .filter((item) => isSameDay(item.start, day))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
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
