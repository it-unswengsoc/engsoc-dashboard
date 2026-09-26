'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTaskStatus } from '@/services/tasks-api';
import TaskDetailDialog from '@/components/TaskDetailDialog';

interface TaskRowProps {
  id: number;
  daysTillDue: number | null; // null if no due date was set
  name: string;      // e.g. "Edit cover photo"
  dateString: string; // e.g. "Mon, 1 June"; "" if no due date
  time: string;      // e.g. "9:30PM"; "" if no due date
  completed: boolean;
  /* Lets the dashboard page keep its own task list (and the OPEN TASKS stat
     derived from it) in sync after a real PATCH — this row doesn't own the
     source of truth, the page does. */
  onToggled: (id: number, completed: boolean) => void;
}

function getBadge(days: number | null): { label: string; styles: string } {
  if (days === null) {
    return { label: 'No due date', styles: 'bg-gray-100 text-gray-500' };
  }
  if (days <= 0) {
    return { label: 'DUE', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  }
  if (days < 7) {
    return {
      label: `${days} ${days === 1 ? 'day' : 'days'}`,
      styles: 'bg-[#F4EFD3] text-gray-700',
    };
  }
  const weeks = Math.floor(days / 7);
  return {
    label: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
    styles: 'bg-[#B1C9DC] text-gray-700',
  };
}

export default function TaskRow({ id, daysTillDue, name, dateString, time, completed, onToggled }: TaskRowProps) {
  const router = useRouter();
  const badge = getBadge(daysTillDue);
  const [done, setDone] = useState(completed);
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  async function handleToggle(checked: boolean) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const previous = done;
    setDone(checked); // optimistic
    setSaving(true);
    try {
      await updateTaskStatus(token, id, checked ? 'completed' : 'pending');
      onToggled(id, checked);
    } catch {
      setDone(previous); // roll back on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-3.5">
      {/* Checkbox — red border on hover, red fill + tick once checked */}
      <label className="relative h-5 w-5 shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={done}
          disabled={saving}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-full w-full cursor-pointer appearance-none rounded-md border border-gray-300 bg-white transition-colors hover:border-2 hover:border-[#ED6672] checked:border-0 checked:bg-[#ED6672] disabled:cursor-wait"
        />
        {done && (
          <svg
            className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </label>

      {/* Task details */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => setDetailOpen(true)}
          className={`text-left text-sm font-bold transition-colors hover:underline ${
            done ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {name}
        </button>
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${badge.styles}`}>
            {badge.label}
          </span>
          {dateString && (
            <span className="font-mono text-xs text-gray-400">
              {dateString} {time}
            </span>
          )}
        </div>
      </div>

      <TaskDetailDialog
        open={detailOpen}
        taskId={id}
        onClose={() => setDetailOpen(false)}
        onCompletionChanged={(taskId, completed) => {
          setDone(completed);
          onToggled(taskId, completed);
        }}
      />
    </div>
  );
}
