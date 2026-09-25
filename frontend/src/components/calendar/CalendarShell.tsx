'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TaskRow from '@/components/TaskRow';
import { CalendarContext } from './CalendarContext';
import CalendarToolbar, { type CalendarView } from './CalendarToolbar';
import CalendarItemDetail from './CalendarItemDetail';
import {
  addDays,
  addMonths,
  addYears,
  startOfWeek,
  MONTHS_LONG,
  toGoogleCalendarItems,
  toTaskCalendarItems,
  CALENDAR_EVENTS_CHANGED_EVENT,
  type CalendarItem,
} from '@/lib/calendar';
import { toOpenTaskRows } from '@/services/dashboard';
import { getMyCalendarEvents } from '@/services/user-calendar-api';
import { getTasks } from '@/services/tasks-api';
import type { TaskItem } from '@/types/tasks';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';

const DUE_TASKS_LIMIT = 5;

interface CalendarShellProps {
  children: React.ReactNode;
}

function viewFromPathname(pathname: string): CalendarView {
  const segment = pathname.split('/').pop();
  if (segment === 'day' || segment === 'week' || segment === 'month' || segment === 'year') return segment;
  return 'month';
}

function shift(d: Date, view: CalendarView, dir: 1 | -1): Date {
  switch (view) {
    case 'day': return addDays(d, dir);
    case 'week': return addDays(d, dir * 7);
    case 'month': return addMonths(d, dir);
    case 'year': return addYears(d, dir);
  }
}

function formatTitle(anchor: Date, view: CalendarView): string {
  if (view === 'day') return `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getDate()}, ${anchor.getFullYear()}`;
  if (view === 'year') return String(anchor.getFullYear());
  if (view === 'week') {
    const start = startOfWeek(anchor);
    return `${MONTHS_LONG[start.getMonth()]} ${start.getFullYear()}`;
  }
  return `${MONTHS_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

export default function CalendarShell({ children }: CalendarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const view = viewFromPathname(pathname);

  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [eventItems, setEventItems] = useState<CalendarItem[]>([]);
  const [googleConnected, setGoogleConnected] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    function loadEvents() {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      getMyCalendarEvents(token)
        .then(({ events, connected }) => {
          if (cancelled) return;
          setEventItems(toGoogleCalendarItems(events));
          setGoogleConnected(connected);
          setLoadError('');
        })
        .catch((err) => {
          if (cancelled) return;
          setLoadError(err instanceof Error ? err.message : 'Failed to load your Google Calendar');
        });
    }

    loadEvents();
    window.addEventListener(CALENDAR_EVENTS_CHANGED_EVENT, loadEvents);
    return () => {
      cancelled = true;
      window.removeEventListener(CALENDAR_EVENTS_CHANGED_EVENT, loadEvents);
    };
  }, [router]);

  // Tasks carry per-user data, same reasoning as the dashboard page — fetched
  // client-side with the signed-in member's own token, not passed down from
  // a Server Component. Refetches on the same nudge the dashboard listens
  // for, so creating/checking off a task anywhere stays in sync here too.
  useEffect(() => {
    function loadTasks() {
      const token = sessionStorage.getItem('token');
      if (!token) return;
      getTasks(token).then(setTasks).catch(() => {});
    }

    loadTasks();
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, loadTasks);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, loadTasks);
  }, []);

  function handleTaskToggled(id: number, completed: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
  }

  const taskItems = useMemo(() => toTaskCalendarItems(tasks), [tasks]);
  const dueTasks = useMemo(() => toOpenTaskRows(tasks, DUE_TASKS_LIMIT), [tasks]);
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const items = useMemo(() => [...eventItems, ...taskItems], [eventItems, taskItems]);

  const title = useMemo(() => formatTitle(anchor, view), [anchor, view]);

  return (
    <CalendarContext.Provider value={{ items, anchor, setAnchor, selected, setSelected }}>
      <div className="flex h-full justify-center gap-8">
        {/* MAIN CALENDAR */}
        <div className="flex h-full max-w-4xl flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CalendarToolbar
            title={title}
            view={view}
            onViewChange={(next) => router.push(`/dashboard/calendar/${next}`)}
            onToday={() => setAnchor(new Date())}
            onPrev={() => setAnchor((d) => shift(d, view, -1))}
            onNext={() => setAnchor((d) => shift(d, view, 1))}
          />
          {!googleConnected && (
            <p className="border-b border-gray-200 bg-[#F4EFD3] px-4 py-2 font-mono text-xs font-bold text-[#7A6A2E]">
              Your Google Calendar isn't connected — sign out and back in with Google to see your events here.
            </p>
          )}
          {loadError && (
            <p className="border-b border-gray-200 bg-[#F1C4C9] px-4 py-2 font-mono text-xs font-bold text-[#8B2E38]">
              {loadError}
            </p>
          )}
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex w-72 shrink-0 flex-col gap-6">
          <CalendarItemDetail item={selected} />

          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-2 bg-[#B1C9DC]" />
            <h2 className="px-4 py-3 text-base font-bold text-gray-900">Due tasks</h2>
            <div className="divide-y divide-gray-200 border-t border-gray-200">
              {dueTasks.length === 0 ? (
                <p className="px-4 py-6 text-center font-mono text-xs text-gray-400">Nothing due — nice.</p>
              ) : (
                dueTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    {...task}
                    completed={taskById.get(task.id)?.completed ?? false}
                    onToggled={handleTaskToggled}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </CalendarContext.Provider>
  );
}
