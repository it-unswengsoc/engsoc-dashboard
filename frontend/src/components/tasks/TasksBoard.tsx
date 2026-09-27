'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KanbanSquare, Link2 } from 'lucide-react';
import { portLabel } from '@/lib/ports';
import { updateTaskStatus } from '@/services/tasks-api';
import type { BoardTask, TaskStatus } from '@/types/tasks';

interface TasksBoardProps {
  tasks: BoardTask[];
  currentUserId: number;
  port: string;
  /* Called after a move saves, so the page re-fetches — a fetch that started
     before the save finished would otherwise be the last word on the card. */
  onMoved?: () => void;
}

/* Past this many, a card shows "+n" instead of more avatars — a whole-port
   task would otherwise run off the card. */
const MAX_AVATARS = 3;

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: 'pending', label: 'To do', accent: 'bg-[#E8C84A]' },
  { status: 'in_progress', label: 'In progress', accent: 'bg-[#3D6C94]' },
  { status: 'completed', label: 'Completed', accent: 'bg-[#8FBF9F]' },
  { status: 'cancelled', label: 'Cancelled', accent: 'bg-gray-300' },
];

/* Same urgency vocabulary as the dashboard's task rows and the requests page:
   red once it's on top of you, cream inside a week, blue while there's room. */
function dueBadge(iso: string | null): { label: string; styles: string } | null {
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

/* "Mine" means I'm any one of the assignees — a shared or whole-port task is
   in every assignee's list. */
function isAssignedTo(task: BoardTask, userId: number): boolean {
  return task.assignees.some((a) => a.id === userId);
}

export default function TasksBoard({ tasks, currentUserId, port, onMoved }: TasksBoardProps) {
  const router = useRouter();
  const [mineOnly, setMineOnly] = useState(false);
  const [board, setBoard] = useState(tasks);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [moveError, setMoveError] = useState('');
  /* Cards whose move is still saving, and the column each was dropped in. A
     saving card can't be dragged again, so two saves never race; and a
     re-fetch that lands mid-save keeps the card where it was dropped, not
     where the server had it before the save. */
  const saving = useRef(new Map<number, TaskStatus>());
  const [savingIds, setSavingIds] = useState<ReadonlySet<number>>(new Set());

  function setSaving(taskId: number, status: TaskStatus | null) {
    if (status === null) saving.current.delete(taskId);
    else saving.current.set(taskId, status);
    setSavingIds(new Set(saving.current.keys()));
  }

  // The page re-fetches when a task is created elsewhere — take the new rows.
  useEffect(() => {
    setBoard(
      tasks.map((task) => {
        const pending = saving.current.get(task.id);
        return pending ? { ...task, status: pending } : task;
      }),
    );
  }, [tasks]);

  const visible = useMemo(
    () => (mineOnly ? board.filter((task) => isAssignedTo(task, currentUserId)) : board),
    [board, mineOnly, currentUserId],
  );

  const mineCount = board.filter((task) => isAssignedTo(task, currentUserId)).length;
  const overdueCount = visible.filter(
    (task) =>
      task.status !== 'completed' &&
      task.status !== 'cancelled' &&
      dueBadge(task.dueAt)?.label === 'Overdue',
  ).length;

  /* Moves the card straight away, then saves it — putting it back where it
     was if the save fails. Only an assignee can drag a card, matching the
     backend's guard, and it moves for every assignee. */
  async function moveTo(status: TaskStatus) {
    const taskId = dragging;
    setDragging(null);
    setDragOver(null);

    const task = board.find((t) => t.id === taskId);
    if (!task || task.status === status || saving.current.has(task.id)) return;

    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const previous = task.status;
    const setStatus = (next: TaskStatus) =>
      setBoard((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));

    setMoveError('');
    setStatus(status);
    setSaving(task.id, status);
    try {
      await updateTaskStatus(token, task.id, status);
      setSaving(task.id, null);
      onMoved?.();
    } catch (err) {
      setSaving(task.id, null);
      setStatus(previous);
      setMoveError(err instanceof Error ? err.message : 'Failed to move task');
    }
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

      {moveError && (
        <p role="alert" className="mt-4 text-xs font-bold text-[#8B2E38]">
          Couldn&apos;t move that task: {moveError}
        </p>
      )}

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
                    const isMine = isAssignedTo(task, currentUserId);
                    const canDrag = isMine && !savingIds.has(task.id);
                    const shown = task.assignees.slice(0, MAX_AVATARS);
                    const hidden = task.assignees.length - shown.length;
                    const isDone = task.status === 'completed' || task.status === 'cancelled';

                    return (
                      <article
                        key={task.id}
                        draggable={canDrag}
                        aria-busy={savingIds.has(task.id)}
                        onDragStart={() => setDragging(task.id)}
                        onDragEnd={() => {
                          setDragging(null);
                          setDragOver(null);
                        }}
                        className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-[#B1C9DC] hover:shadow-md ${
                          canDrag ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${
                          dragging === task.id || savingIds.has(task.id) ? 'opacity-40' : ''
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
                            title={task.assignees.map((a) => a.name).join(', ')}
                            className="flex items-center -space-x-1.5"
                          >
                            {shown.map((assignee) => (
                              <span
                                key={assignee.id}
                                className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[9px] font-bold ring-2 ring-white ${
                                  assignee.id === currentUserId
                                    ? 'bg-[#3D6C94] text-white'
                                    : 'bg-[#DCE7F0] text-[#3D6C94]'
                                }`}
                              >
                                {initials(assignee.name)}
                              </span>
                            ))}
                            {hidden > 0 && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 font-mono text-[9px] font-bold text-gray-500 ring-2 ring-white">
                                +{hidden}
                              </span>
                            )}
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
