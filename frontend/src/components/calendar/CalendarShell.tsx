'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TaskRow from '@/components/TaskRow';
import { CalendarContext } from './CalendarContext';
import CalendarToolbar, { type CalendarView } from './CalendarToolbar';
import CalendarItemDetail from './CalendarItemDetail';
import { addDays, addMonths, addYears, startOfWeek, MONTHS_LONG, type CalendarItem } from '@/lib/calendar';
import type { TaskRowData } from '@/types/dashboard';

interface CalendarShellProps {
  items: CalendarItem[];
  dueTasks: TaskRowData[];
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

export default function CalendarShell({ items, dueTasks, children }: CalendarShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const view = viewFromPathname(pathname);

  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<CalendarItem | null>(null);

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
                dueTasks.map((task) => <TaskRow key={task.id} {...task} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </CalendarContext.Provider>
  );
}
