'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import type { TaskStatus } from '@/types/tasks';

/* TaskRow renders on the dashboard's "Open Tasks" widget and the calendar,
   both on every load. A plain static import here bundled TaskDetailDialog's
   whole tree into that initial load regardless of whether any row was ever
   clicked. Loaded on demand instead; see the identical fix on
   AnnouncementComposer. The dialog fetches the task itself and shows it
   the way the tasks board does. */
const TaskDetailDialog = dynamic(() => import('@/components/TaskDetailDialog'), { ssr: false });

interface TaskRowProps {
  id: number;
  status: TaskStatus;
  daysTillDue: number | null; // null if no due date was set
  name: string;      // e.g. "Edit cover photo"
  dateString: string; // e.g. "Mon, 1 June"; "" if no due date
  time: string;      // e.g. "9:30PM"; "" if no due date
  /* Lets the page keep its own task list (and the OPEN TASKS stat derived
     from it) in sync after a move in the dialog — this row doesn't own the
     source of truth, the page does. */
  onStatusChanged: (id: number, status: TaskStatus) => void;
}

/* The board's column names and colours (components/tasks/TasksBoard.tsx). */
const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_TEXT: Record<TaskStatus, string> = {
  pending: 'text-[#9A7B12]',
  in_progress: 'text-[#3D6C94]',
  completed: 'text-[#3F7F55]',
  cancelled: 'text-gray-400',
};

/* A ring that fills as the task moves along: empty to do, half in
   progress, a tick once done. */
function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === 'completed') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="#8FBF9F" />
        <path d="M6 10.5l2.5 2.5L14 7.5" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'in_progress') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" stroke="#3D6C94" strokeWidth={2} />
        <path d="M10 5a5 5 0 0 1 0 10z" fill="#3D6C94" />
      </svg>
    );
  }
  if (status === 'cancelled') {
    return (
      <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" stroke="#D1D5DB" strokeWidth={2} />
        <path d="M6.5 13.5l7-7" stroke="#D1D5DB" strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="#E8C84A" strokeWidth={2} strokeDasharray="3.2 2.1" />
    </svg>
  );
}

/* How soon it's due, in the same colours the row's always used. */
function getBadge(days: number | null): { label: string; styles: string } | null {
  if (days === null) return null;
  if (days < 0) return { label: 'Overdue', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  if (days === 0) return { label: 'Today', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  if (days === 1) return { label: 'Tomorrow', styles: 'bg-[#F4EFD3] text-gray-700' };
  if (days < 7) return { label: `${days} days`, styles: 'bg-[#F4EFD3] text-gray-700' };
  const weeks = Math.floor(days / 7);
  return { label: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`, styles: 'bg-[#B1C9DC]/60 text-gray-700' };
}

/* The whole row opens the task — status moves happen in the dialog, the
   same dropdown the board uses. */
export default function TaskRow({ id, status, daysTillDue, name, dateString, time, onStatusChanged }: TaskRowProps) {
  /* Moves made in the open dialog show here straight away, but only reach
     the page once it closes: a task marked completed drops off the page's
     open-tasks list, which would take this row — and the dialog — with it. */
  const [shownStatus, setShownStatus] = useState(status);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hasOpenedDetailOnce, setHasOpenedDetailOnce] = useState(false);
  const [lastStatus, setLastStatus] = useState(status);
  if (status !== lastStatus) {
    setLastStatus(status);
    setShownStatus(status);
  }

  const badge = getBadge(daysTillDue);
  const done = shownStatus === 'completed' || shownStatus === 'cancelled';

  function closeDetail() {
    setDetailOpen(false);
    if (shownStatus !== status) onStatusChanged(id, shownStatus);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setHasOpenedDetailOnce(true);
          setDetailOpen(true);
        }}
        className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
      >
        <StatusIcon status={shownStatus} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`min-w-0 flex-1 truncate text-sm font-bold ${done ? 'text-gray-400 line-through' : 'text-gray-900'}`}
            >
              {name}
            </span>
            {badge && !done && (
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${badge.styles}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className={`shrink-0 font-semibold ${STATUS_TEXT[shownStatus]}`}>{STATUS_LABELS[shownStatus]}</span>
            <span className="text-gray-300">·</span>
            <span className="truncate font-mono text-gray-400">
              {dateString ? `${dateString} ${time}` : 'No due date'}
            </span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
      </button>

      {hasOpenedDetailOnce && (
        <TaskDetailDialog
          open={detailOpen}
          taskId={id}
          onClose={closeDetail}
          onStatusChanged={(_, next) => setShownStatus(next)}
        />
      )}
    </>
  );
}
