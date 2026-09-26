'use client';

import { useMemo, useState } from 'react';
import { KanbanSquare, Link2 } from 'lucide-react';
import { portLabel } from '@/lib/ports';
import type { Member } from '@/types/members';
import type { BoardTask, TaskStatus } from '@/types/tasks';

interface TasksBoardProps {
  tasks: BoardTask[];
  currentUser: Member;
  port: string;
}

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'pending', label: 'To do', accent: 'bg-[#E8C84A]' },
  { status: 'in_progress', label: 'In progress', accent: 'bg-[#3D6C94]' },
  { status: 'completed', label: 'Completed', accent: 'bg-[#8FBF9F]' },
  { status: 'cancelled', label: 'Cancelled', accent: 'bg-gray-300' },
];

/* Same urgency vocabulary as the dashboard's task rows and the requests page:
   red once it's on top of you, cream inside a week, blue while there's room. */
function dueBadge(iso?: string): { label: string; styles: string } | null {
  if (!iso) return null;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);

  if (days < 0) return { label: 'Overdue', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  if (days === 0) return { label: 'Due today', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  if (days < 7) {
    return { label: `${days} ${days === 1 ? 'day' : 'days'}`, styles: 'bg-[#F4EFD3] text-gray-700' };
  }

  const weeks = Math.floor(days / 7);
  return { label: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`, styles: 'bg-[#B1C9DC] text-gray-700' };
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TasksBoard({ tasks, currentUser, port }: TasksBoardProps) {
  const [mineOnly, setMineOnly] = useState(false);
  const [board, setBoard] = useState(tasks);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const visible = useMemo(
    () => (mineOnly ? board.filter((task) => task.assignedTo.id === currentUser.id) : board),
    [board, mineOnly, currentUser.id],
  );

  const mineCount = board.filter((task) => task.assignedTo.id === currentUser.id).length;
  const overdueCount = visible.filter(
    (task) =>
      task.status !== 'completed' &&
      task.status !== 'cancelled' &&
      dueBadge(task.dueAt)?.label === 'Overdue',
  ).length;

  /* Dropping only moves the card locally for now. PATCH /tasks/:id exists but
     only takes pending/completed until the backend accepts all four statuses.
     Only the assignee can move a card, matching the backend's guard. */
  function moveTo(status: TaskStatus) {
    if (dragging === null) return;
    setBoard((prev) =>
      prev.map((task) => (task.id === dragging ? { ...task, status } : task)),
    );
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KanbanSquare className="h-7 w-7 text-gray-900" strokeWidth={2} />
          <h1 className="text-3xl font-bold leading-none text-gray-900">Tasks</h1>
          <span className="rounded-full bg-[#B1C9DC]/30 px-3.5 py-1.5 font-mono text-xs font-bold uppercase leading-none tracking-wide text-[#3D6C94]">
            {portLabel(port)}
          </span>
        </div>

        {overdueCount > 0 && (
          <span className="rounded-xl bg-[#F1C4C9] px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wide text-[#8B2E38]">
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* SCOPE */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { mine: false, label: `Whole port`, count: board.length },
          { mine: true, label: 'My tasks', count: mineCount },
        ].map(({ mine, label, count }) => (
          <button
            key={label}
            onClick={() => setMineOnly(mine)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              mineOnly === mine
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                mineOnly === mine ? 'bg-white/20' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* BOARD */}
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((column) => {
          const cards = visible.filter((task) => task.status === column.status);
          const isTarget = dragOver === column.status;

          return (
            <section
              key={column.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(column.status);
              }}
              onDragLeave={() => setDragOver((prev) => (prev === column.status ? null : prev))}
              onDrop={() => moveTo(column.status)}
              className={`flex min-h-[8rem] flex-col rounded-2xl border transition-colors ${
                isTarget ? 'border-[#3D6C94] bg-[#B1C9DC]/15' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${column.accent}`}
                  />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    {column.label}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-gray-400">{cards.length}</span>
              </div>

              <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {cards.length === 0 ? (
                  <p className="px-1 py-6 text-center font-mono text-[11px] text-gray-300">
                    Nothing here
                  </p>
                ) : (
                  cards.map((task) => {
                    const due = dueBadge(task.dueAt);
                    const isMine = task.assignedTo.id === currentUser.id;
                    const isDone = task.status === 'completed' || task.status === 'cancelled';

                    return (
                      <article
                        key={task.id}
                        draggable={isMine}
                        onDragStart={() => setDragging(task.id)}
                        onDragEnd={() => {
                          setDragging(null);
                          setDragOver(null);
                        }}
                        className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-[#B1C9DC] hover:shadow-md ${
                          isMine ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${
                          dragging === task.id ? 'opacity-40' : ''
                        }`}
                      >
                        <p
                          className={`text-sm font-bold ${
                            isDone ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}
                        >
                          {task.title}
                        </p>

                        {task.requestTitle && (
                          <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-gray-400">
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{task.requestTitle}</span>
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span
                            title={task.assignedTo.name}
                            className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                              isMine ? 'bg-[#3D6C94] text-white' : 'bg-[#B1C9DC]/40 text-[#3D6C94]'
                            }`}
                          >
                            {initials(task.assignedTo.name)}
                          </span>

                          {due && !isDone && (
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${due.styles}`}
                            >
                              {due.label}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
