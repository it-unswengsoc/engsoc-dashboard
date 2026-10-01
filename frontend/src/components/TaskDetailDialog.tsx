'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Download, Paperclip, Trash2, ExternalLink } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import Select from '@/components/dialogs/Select';
import {
  getTask,
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
  updateTaskStatus,
  type TaskItem,
  type TaskAttachment,
} from '@/services/tasks-api';
import DriveFilePicker, { type PickedAttachment } from '@/components/DriveFilePicker';
import { downloadRequestAttachment } from '@/services/requests-api';
import type { BoardTask, TaskStatus } from '@/types/tasks';

export interface TaskDetailDialogProps {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onCompletionChanged?: (id: number, completed: boolean) => void;
  /* Opened from the tasks board: the card already carries the task, with
     its status and who's on it, so nothing is fetched. A read-only view —
     status changes on the board itself, by dragging. */
  boardTask?: BoardTask;
  currentUserId?: number;
  /* Given for someone who can move the card (an assignee): the status tag
     becomes a dropdown that moves it to that column, same as dragging. */
  onStatusChange?: (status: TaskStatus) => void;
  statusSaving?: boolean;
  statusError?: string;
}

/* The same colour language as the board's columns and the requests page's
   top strip. */
const STATUS_STRIPS: Record<TaskStatus, string> = {
  pending: 'bg-[#F4EFD3]',
  in_progress: 'bg-[#B1C9DC]',
  completed: 'bg-[#8FBF9F]/60',
  cancelled: 'bg-gray-200',
};

/* "Sat 4 Oct, 6:00 pm", and how far off that is. */
function formatDue(iso: string): { when: string; relative: string; overdue: boolean } {
  const due = new Date(iso);
  const when = due.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(due) - startOfDay(new Date())) / 86_400_000);
  const relative =
    days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : days < 7 ? `In ${days} days` : `In ${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? 'week' : 'weeks'}`;
  return { when, relative, overdue: days < 0 };
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/* The board's columns, in order, with the same dots as their headings
   (components/tasks/TasksBoard.tsx's COLUMNS). */
const STATUS_DOTS: Record<TaskStatus, string> = {
  pending: 'bg-[#E8C84A]',
  in_progress: 'bg-[#3D6C94]',
  completed: 'bg-[#8FBF9F]',
  cancelled: 'bg-gray-300',
};

const STATUS_OPTIONS = (['pending', 'in_progress', 'completed', 'cancelled'] as TaskStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value],
  dot: STATUS_DOTS[value],
}));

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: 'bg-[#F4EFD3] text-gray-700',
  in_progress: 'bg-[#B1C9DC] text-gray-700',
  completed: 'bg-[#8FBF9F]/40 text-gray-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TaskDetailDialog({
  open,
  taskId,
  onClose,
  onCompletionChanged,
  boardTask,
  currentUserId,
  onStatusChange,
  statusSaving = false,
  statusError,
}: TaskDetailDialogProps) {
  const isAssignee = boardTask ? boardTask.assignees.some((a) => a.id === currentUserId) : true;
  const [task, setTask] = useState<TaskItem | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');

  async function downloadFile(requestId: number, file: { id: number; fileName: string }) {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    setFileError('');
    try {
      await downloadRequestAttachment(token, requestId, file);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to download file');
    }
  }

  useEffect(() => {
    // The board hands in everything its view shows; nothing to fetch.
    if (!open || taskId === null || boardTask) return;
    setError('');
    setLoading(true);

    const token = sessionStorage.getItem('token');
    if (!token) return;

    Promise.all([getTask(token, taskId), getTaskAttachments(token, taskId)])
      .then(([taskData, attachmentsData]) => {
        setTask(taskData);
        setAttachments(attachmentsData);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load task'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  async function handleToggleComplete() {
    if (!task) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const nextCompleted = !task.completed;
    try {
      const updated = await updateTaskStatus(token, task.id, nextCompleted ? 'completed' : 'pending');
      setTask(updated);
      onCompletionChanged?.(task.id, nextCompleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }

  async function handleAttach(picked: PickedAttachment) {
    if (taskId === null) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setError('');
    try {
      const attachment = await addTaskAttachment(token, taskId, picked);
      setAttachments((prev) => [...prev, attachment]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach file');
    }
  }

  async function handleRemoveAttachment(attachmentId: number) {
    if (taskId === null) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const previous = attachments;
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId)); // optimistic
    try {
      await deleteTaskAttachment(token, taskId, attachmentId);
    } catch (err) {
      setAttachments(previous); // roll back
      setError(err instanceof Error ? err.message : 'Failed to remove attachment');
    }
  }

  /* From the tasks board: layout C — a status strip, the title, due date
     and people as tiles, then description and attachments. */
  if (boardTask) {
    const due = boardTask.dueAt ? formatDue(boardTask.dueAt) : null;
    const isClosed = boardTask.status === 'completed' || boardTask.status === 'cancelled';
    const overdue = !isClosed && !!due?.overdue;
    const meta = [
      boardTask.requestTitle && `From ${boardTask.requestTitle}`,
      boardTask.assignedBy &&
        `assigned by ${boardTask.assignedBy.id === currentUserId ? 'you' : boardTask.assignedBy.name}`,
    ].filter(Boolean);
    const others = boardTask.assignees.filter((a) => a.id !== currentUserId);
    const peopleLabel = [
      ...(isAssignee ? ['You'] : []),
      ...others.map((a) => a.name),
    ];

    return (
      <Dialog open={open} title={boardTask.title} size="3xl" bare onClose={onClose}>
        <div className={`h-2 ${STATUS_STRIPS[boardTask.status]}`} />

        <div className="flex items-start justify-between gap-4 py-5 pl-7 pr-14">
          <div className="min-w-0">
            <h2 className={`text-xl font-bold ${isClosed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {boardTask.title}
            </h2>
            {meta.length > 0 && (
              <p className="mt-1.5 font-mono text-xs text-gray-500">
                {meta.join(' · ').replace(/^assigned/, 'Assigned')}
              </p>
            )}
          </div>
          {onStatusChange ? (
            <div className={`w-40 shrink-0 ${statusSaving ? 'pointer-events-none opacity-60' : ''}`}>
              <span className="sr-only">Move to column</span>
              <Select
                value={boardTask.status}
                options={STATUS_OPTIONS}
                onChange={(value) => onStatusChange(value as TaskStatus)}
              />
            </div>
          ) : (
            <span
              className={`shrink-0 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[boardTask.status]}`}
            >
              {STATUS_LABELS[boardTask.status]}
            </span>
          )}
        </div>

        {onStatusChange && statusError && (
          <p role="alert" className="-mt-2 px-7 pb-3 text-xs font-bold text-[#8B2E38]">
            Couldn&apos;t move it: {statusError}
          </p>
        )}

        <div className="grid gap-3 px-7 pb-5 sm:grid-cols-2">
          {/* An open task past its due date turns this tile red, with a badge,
              so it can't be missed. */}
          <div
            className={`rounded-xl px-4 py-3 ${
              overdue ? 'bg-[#F1C4C9]/50 ring-1 ring-inset ring-[#ED6672]/50' : 'bg-[#F3F6F9]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-wide ${
                  overdue ? 'text-[#8B2E38]' : 'text-[#5B6B7A]'
                }`}
              >
                Due
              </span>
              {overdue && (
                <span className="flex items-center gap-1 rounded-full bg-[#ED6672] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </span>
              )}
            </div>
            {due ? (
              <>
                <p className={`mt-1 text-[15px] font-bold ${overdue ? 'text-[#8B2E38]' : 'text-gray-900'}`}>{due.when}</p>
                {!isClosed && !overdue && <p className="text-xs font-semibold text-gray-500">{due.relative}</p>}
              </>
            ) : (
              <p className="mt-1 text-[15px] font-bold text-gray-400">No due date</p>
            )}
          </div>

          <div className="rounded-xl bg-[#F3F6F9] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-[#5B6B7A]">Assigned to</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex">
                {boardTask.assignees.slice(0, 4).map((a, i) => (
                  <span
                    key={a.id}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F3F6F9] font-mono text-[9px] font-bold ${
                      a.id === currentUserId ? 'bg-[#3D6C94] text-white' : 'bg-[#B1C9DC] text-[#1F3B52]'
                    } ${i > 0 ? '-ml-2' : ''}`}
                  >
                    {initials(a.name)}
                  </span>
                ))}
              </div>
              <span className="min-w-0 truncate text-sm font-semibold text-gray-900" title={peopleLabel.join(', ')}>
                {peopleLabel.length <= 2
                  ? peopleLabel.join(' and ')
                  : `${peopleLabel.slice(0, 2).join(', ')} and ${peopleLabel.length - 2} more`}
              </span>
            </div>
          </div>
        </div>

        {boardTask.description && (
          <div className="border-t border-gray-200 px-7 pb-6 pt-4">
            <span className="text-[13px] font-semibold text-gray-500">Description</span>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-gray-800">{boardTask.description}</p>
          </div>
        )}

        {/* What the requester attached (a reimbursement's receipt), for the
            people doing the work — the backend lets a request's task
            assignees download its files. */}
        {isAssignee && boardTask.requestId && (boardTask.requestAttachments?.length ?? 0) > 0 && (
          <div className="border-t border-gray-200 px-7 pb-6 pt-4">
            <span className="text-[13px] font-semibold text-gray-500">Files from the request</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {boardTask.requestAttachments!.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => downloadFile(boardTask.requestId!, file)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#B1C9DC] hover:text-[#3D6C94]"
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                  {file.fileName}
                  <Download className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                </button>
              ))}
            </div>
            {fileError && (
              <p role="alert" className="mt-2 text-xs font-bold text-[#8B2E38]">
                {fileError}
              </p>
            )}
          </div>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} title="Task" size="md" onClose={onClose}>
      <div className="mt-5 flex flex-col gap-4">
        {loading && <p className="font-mono text-xs text-gray-400">Loading…</p>}
        {!loading && task && (
          <>
            <div className="flex items-start gap-3">
              <label className="relative mt-0.5 h-5 w-5 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={handleToggleComplete}
                  className="h-full w-full cursor-pointer appearance-none rounded-md border border-gray-300 bg-white transition-colors hover:border-2 hover:border-[#ED6672] checked:border-0 checked:bg-[#ED6672]"
                />
                {task.completed && (
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
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {task.name}
                </h3>
                {task.dueAt && (
                  <p className="font-mono text-xs text-gray-400">Due {new Date(task.dueAt).toLocaleString()}</p>
                )}
              </div>
            </div>

            {task.description && <p className="text-sm text-gray-700">{task.description}</p>}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Attachments</span>

              {attachments.length === 0 && (
                <p className="font-mono text-xs text-gray-400">Nothing attached yet.</p>
              )}
              {attachments.map((a) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-sm font-bold text-gray-700">{a.name}</span>
                  {a.webViewLink && (
                    <a
                      href={a.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-gray-400 hover:text-[#3D6C94]"
                      aria-label={`Open ${a.name}`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleRemoveAttachment(a.id)}
                    className="shrink-0 text-gray-400 hover:text-[#8B2E38]"
                    aria-label={`Remove ${a.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <DriveFilePicker onAttach={handleAttach} />
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="text-xs font-bold text-[#ED6672]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-2 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
}
