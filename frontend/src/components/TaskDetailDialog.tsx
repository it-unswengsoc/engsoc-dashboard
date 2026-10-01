'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, MoreVertical, Paperclip, Pencil, X } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import Select from '@/components/dialogs/Select';
import {
  getBoardTask,
  updateTaskDetails,
  updateTaskStatus,
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
  type TaskAttachment,
} from '@/services/tasks-api';
import DriveFilePicker, { type PickedAttachment } from '@/components/DriveFilePicker';
import { useProfile } from '@/lib/profile-context';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';
import { downloadRequestAttachment, getRequest } from '@/services/requests-api';
import RequestAnswers from '@/components/requests/RequestAnswers';
import { requestForm } from '@/lib/request-forms';
import type { RequestDetail } from '@/types/requests';
import type { BoardTask, TaskStatus } from '@/types/tasks';

export interface TaskDetailDialogProps {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  /* Opened from the dashboard or calendar, where the task is fetched by id
     and the dialog moves it itself — this hears about it afterwards. */
  onStatusChanged?: (id: number, status: TaskStatus) => void;
  /* Opened from the tasks board: the card already carries the task, with
     its status and who's on it, so nothing is fetched. */
  boardTask?: BoardTask;
  /* Defaults to the signed-in member's profile. */
  currentUserId?: number;
  /* The board's own move, for someone who can move the card (an assignee):
     the status tag becomes a dropdown that moves it to that column, same as
     dragging. Without a boardTask, the dialog makes the move itself. */
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
  // A date-only due date is stored as midnight in the backend's time zone —
  // local midnight with a local server, UTC midnight on a UTC host (Vercel),
  // which reads as 10 or 11 am in Sydney. Either shows without a time; a task
  // genuinely due at that hour loses its time too, which is the trade-off.
  const isMidnight = (hours: number, minutes: number) => hours === 0 && minutes === 0;
  const dateOnly = isMidnight(due.getHours(), due.getMinutes()) || isMidnight(due.getUTCHours(), due.getUTCMinutes());
  const when = due.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(dateOnly ? {} : { hour: 'numeric', minute: '2-digit' }),
  });
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

/* An ISO due date as the edit form's date and time inputs — a date-only
   due date (see formatDue) leaves the time empty. */
function toDueInputs(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const due = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
  const isMidnight = (hours: number, minutes: number) => hours === 0 && minutes === 0;
  const dateOnly = isMidnight(due.getHours(), due.getMinutes()) || isMidnight(due.getUTCHours(), due.getUTCMinutes());
  return { date, time: dateOnly ? '' : `${pad(due.getHours())}:${pad(due.getMinutes())}` };
}

/* The three-dot menu — only rendered for whoever created the task; same
   look as the event dialog's (components/calendar/EventDetailModal.tsx). */
function OptionsMenu({ onEdit }: { onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Task options"
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5 text-[#3D6C94]" />
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

const INPUT_STYLES =
  'w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]';
const LABEL_STYLES = 'text-xs font-bold uppercase tracking-wide text-gray-500';

/* Title, due date, note and attachments — the parts of a task its creator
   can change. Status moves on the board; assignees stay as they were made.
   A picked file is uploaded to Drive straight away (as in TaskComposer), but
   adding and removing attachments only happens on Save, so Cancel leaves the
   task as it was. */
function EditTaskForm({
  task,
  attachments,
  onCancel,
  onSaved,
}: {
  task: BoardTask;
  attachments: TaskAttachment[];
  onCancel: () => void;
  onSaved: (task: BoardTask, attachments: TaskAttachment[]) => void;
}) {
  const initialDue = toDueInputs(task.dueAt);
  const [title, setTitle] = useState(task.title);
  const [titleMissing, setTitleMissing] = useState(false);
  const [dueDate, setDueDate] = useState(initialDue.date);
  const [dueTime, setDueTime] = useState(initialDue.time);
  const [description, setDescription] = useState(task.description ?? '');
  const [kept, setKept] = useState(attachments);
  const [added, setAdded] = useState<PickedAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleMissing(true);
      return;
    }
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setSaving(true);
    setError('');
    try {
      const saved = await updateTaskDetails(token, task.id, {
        title: trimmed,
        description: description.trim() || null,
        dueDate: dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : null,
      });
      const removed = attachments.filter((a) => !kept.some((k) => k.id === a.id));
      await Promise.all(removed.map((a) => deleteTaskAttachment(token, task.id, a.id)));
      const linked = await Promise.all(added.map((a) => addTaskAttachment(token, task.id, a)));
      onSaved(saved, [...kept, ...linked]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-7 pb-6 pt-5">
      <h2 className="pr-8 text-xl font-bold text-gray-900">Edit task</h2>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_STYLES}>
          Task name <span className="text-[#ED6672]">*</span>
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setTitleMissing(false);
          }}
          className={`${INPUT_STYLES} ${titleMissing ? 'ring-2 ring-[#ED6672]' : ''}`}
        />
        {titleMissing && (
          <span role="alert" className="text-xs font-bold text-[#ED6672]">
            Task name is required
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_STYLES}>Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT_STYLES} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL_STYLES}>Due time</span>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={INPUT_STYLES} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={LABEL_STYLES}>Note</span>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${INPUT_STYLES} resize-none`}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className={LABEL_STYLES}>Attachments</span>
        {[
          ...kept.map((a) => ({ key: `kept-${a.id}`, name: a.name, remove: () => setKept((prev) => prev.filter((k) => k.id !== a.id)) })),
          ...added.map((a) => ({
            key: `added-${a.driveFileId}`,
            name: a.name,
            remove: () => setAdded((prev) => prev.filter((p) => p.driveFileId !== a.driveFileId)),
          })),
        ].map((file) => (
          <div key={file.key} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="flex-1 truncate text-sm font-bold text-gray-700">{file.name}</span>
            <button
              type="button"
              onClick={file.remove}
              className="shrink-0 text-gray-400 hover:text-[#8B2E38]"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <DriveFilePicker onAttach={(picked) => setAdded((prev) => [...prev, picked])} />
      </div>

      {error && (
        <p role="alert" className="text-xs font-bold text-[#ED6672]">
          {error}
        </p>
      )}

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

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
  onStatusChanged,
  boardTask,
  currentUserId,
  onStatusChange,
  statusSaving = false,
  statusError,
}: TaskDetailDialogProps) {
  const { profile } = useProfile();
  const userId = currentUserId ?? profile?.id;
  /* Without a boardTask (the dashboard, the calendar), the task is fetched
     in the board's shape so it shows exactly as the board shows it. */
  const [fetched, setFetched] = useState<BoardTask | null>(null);
  const [loadError, setLoadError] = useState('');
  const [ownSaving, setOwnSaving] = useState(false);
  const [ownError, setOwnError] = useState('');
  const [editing, setEditing] = useState(false);
  /* A saved edit, shown until the board's re-fetch hands in the new card. */
  const [edited, setEdited] = useState<BoardTask | null>(null);
  /* Null while loading, or for someone who can see the card but not the
     task itself (a teammate on the port) — the section just doesn't show. */
  const [attachments, setAttachments] = useState<TaskAttachment[] | null>(null);
  const [fileError, setFileError] = useState('');
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => setEdited(null), [boardTask]);

  useEffect(() => {
    if (open) setEditing(false);
  }, [open, taskId]);

  useEffect(() => {
    if (!open || taskId === null || boardTask) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    setLoadError('');
    setOwnError('');
    getBoardTask(token, taskId)
      .then((found) => {
        if (!cancelled) setFetched(found);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load task');
      });
    return () => {
      cancelled = true;
    };
  }, [open, taskId, boardTask]);

  const baseTask = boardTask ?? (fetched?.id === taskId ? fetched : null);
  const task =
    baseTask && edited?.id === baseTask.id
      ? { ...baseTask, title: edited.title, description: edited.description, dueAt: edited.dueAt }
      : baseTask;

  const loadedTaskId = task?.id;
  useEffect(() => {
    setAttachments(null);
    if (!open || loadedTaskId === undefined) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    getTaskAttachments(token, loadedTaskId)
      .then((found) => {
        if (!cancelled) setAttachments(found);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, loadedTaskId]);

  // The task's request, when it came from one and the viewer may see it.
  const requestId = task?.requestId;
  useEffect(() => {
    setRequest(null);
    setRequestLoading(false);
    setFileError('');
    if (!open || !requestId) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;
    let cancelled = false;
    setRequestLoading(true);
    getRequest(token, requestId)
      .then((found) => {
        if (!cancelled) setRequest(found);
      })
      .catch(() => {}) // can't see it: the section just doesn't show
      .finally(() => {
        if (!cancelled) setRequestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

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

  /* The dialog's own move, for a fetched task — optimistic, rolled back if
     the save fails. */
  async function moveFetched(status: TaskStatus) {
    if (!fetched) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const previous = fetched.status;
    setFetched({ ...fetched, status });
    setOwnSaving(true);
    setOwnError('');
    try {
      await updateTaskStatus(token, fetched.id, status);
      onStatusChanged?.(fetched.id, status);
    } catch (err) {
      setFetched((f) => f && { ...f, status: previous });
      setOwnError(err instanceof Error ? err.message : 'Failed to move task');
    } finally {
      setOwnSaving(false);
    }
  }

  function handleSaved(saved: BoardTask, savedAttachments: TaskAttachment[]) {
    setAttachments(savedAttachments);
    if (boardTask) setEdited(saved);
    else setFetched((f) => f && { ...saved, status: f.status });
    setEditing(false);
    // The dashboard, calendar and board each re-fetch on this.
    window.dispatchEvent(new Event(DASHBOARD_DATA_CHANGED_EVENT));
  }

  if (!task) {
    return (
      <Dialog open={open} title="Task" size="3xl" bare onClose={onClose}>
        <div className="h-2 bg-gray-100" />
        {loadError ? (
          <p role="alert" className="px-7 py-6 pr-14 text-sm font-bold text-[#8B2E38]">
            {loadError}
          </p>
        ) : (
          <div className="flex flex-col gap-3 px-7 py-6" aria-busy="true">
            <span className="h-5 w-56 animate-pulse rounded bg-gray-100" />
            <div className="grid gap-3 sm:grid-cols-2">
              <span className="h-16 animate-pulse rounded-xl bg-gray-100" />
              <span className="h-16 animate-pulse rounded-xl bg-gray-100" />
            </div>
          </div>
        )}
      </Dialog>
    );
  }

  const isAssignee = userId !== undefined && task.assignees.some((a) => a.id === userId);
  const isCreator = userId !== undefined && task.assignedBy?.id === userId;
  const changeStatus = boardTask ? onStatusChange : isAssignee ? moveFetched : undefined;
  const savingStatus = boardTask ? statusSaving : ownSaving;
  const moveError = boardTask ? statusError : ownError;

  if (editing) {
    return (
      <Dialog open={open} title={`Edit ${task.title}`} size="3xl" bare onClose={onClose}>
        <div className={`h-2 ${STATUS_STRIPS[task.status]}`} />
        <EditTaskForm
          task={task}
          attachments={attachments ?? []}
          onCancel={() => setEditing(false)}
          onSaved={handleSaved}
        />
      </Dialog>
    );
  }

  const due = task.dueAt ? formatDue(task.dueAt) : null;
  const isClosed = task.status === 'completed' || task.status === 'cancelled';
  const overdue = !isClosed && !!due?.overdue;
  // A request's task names its type (as a pill) and who sent it, rather
  // than the request's title — which is the task's own title anyway.
  const requestTypeLabel = task.requestType
    ? (requestForm(task.requestType)?.label ?? task.requestType)
    : null;
  // Who sent a request shows in its section below. A viewer who can't open
  // the request gets no section, so the header names the requester for
  // them instead; a task without a known request type keeps "From <title>".
  const requestShown = requestLoading || request !== null;
  const meta = [
    requestTypeLabel
      ? !requestShown && task.requesterName && `from ${task.requesterName}`
      : task.requestTitle && `From ${task.requestTitle}`,
    // With a note, the note's card names the assigner instead.
    !task.description &&
      task.assignedBy &&
      `assigned by ${task.assignedBy.id === userId ? 'you' : task.assignedBy.name}`,
  ].filter(Boolean) as string[];
  const assignerName = task.assignedBy
    ? task.assignedBy.id === userId
      ? 'you'
      : task.assignedBy.name
    : null;
  const others = task.assignees.filter((a) => a.id !== userId);
  const peopleLabel = [
    ...(isAssignee ? ['You'] : []),
    ...others.map((a) => a.name),
  ];

  return (
    <Dialog open={open} title={task.title} size="3xl" bare onClose={onClose}>
      <div className={`h-2 ${STATUS_STRIPS[task.status]}`} />

      <div className="flex items-start justify-between gap-4 py-5 pl-7 pr-14">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className={`text-xl font-bold ${isClosed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              {task.title}
            </h2>
            {requestTypeLabel && (
              <span className="rounded-full bg-[#B1C9DC]/35 px-2.5 py-0.5 text-xs font-semibold text-[#2A4A63]">
                {requestTypeLabel}
              </span>
            )}
          </div>
          {meta.length > 0 && (
            <p className="mt-1.5 font-mono text-xs text-gray-500">{meta.join(' · ').replace(/^./, (c) => c.toUpperCase())}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {changeStatus ? (
            <div className={`w-40 ${savingStatus ? 'pointer-events-none opacity-60' : ''}`}>
              <span className="sr-only">Move to column</span>
              <Select
                value={task.status}
                options={STATUS_OPTIONS}
                onChange={(value) => changeStatus(value as TaskStatus)}
              />
            </div>
          ) : (
            <span
              className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[task.status]}`}
            >
              {STATUS_LABELS[task.status]}
            </span>
          )}
          {isCreator && attachments !== null && <OptionsMenu onEdit={() => setEditing(true)} />}
        </div>
      </div>

      {changeStatus && moveError && (
        <p role="alert" className="-mt-2 px-7 pb-3 text-xs font-bold text-[#8B2E38]">
          Couldn&apos;t move it: {moveError}
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
              {task.assignees.slice(0, 4).map((a, i) => (
                <span
                  key={a.id}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F3F6F9] font-mono text-[9px] font-bold ${
                    a.id === userId ? 'bg-[#3D6C94] text-white' : 'bg-[#B1C9DC] text-[#1F3B52]'
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

      {/* The description is the assigner's note — when a request was
          accepted, whatever the accepter wrote for whoever picks it up — so
          it reads as a note from them. */}
      {task.description && (
        <div className="px-7 pb-5">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              {task.assignedBy && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B1C9DC] font-mono text-[9px] font-bold text-[#1F3B52]">
                  {initials(task.assignedBy.name)}
                </span>
              )}
              <span className="text-[13px] font-semibold text-gray-500">
                {assignerName ? `Assigned by ${assignerName}` : 'Note'}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-gray-800">{task.description}</p>
          </div>
        </div>
      )}

      {attachments && attachments.length > 0 && (
        <div className="px-7 pb-5">
          <span className="text-[13px] font-semibold text-gray-500">Attachments</span>
          <div className="mt-2 flex flex-col gap-2">
            {attachments.map((a) => {
              const row = (
                <>
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="flex-1 truncate text-sm font-bold text-gray-700">{a.name}</span>
                  {a.webViewLink && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
                </>
              );
              return a.webViewLink ? (
                <a
                  key={a.id}
                  href={a.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-[#F3F6F9] px-3 py-2 transition-colors hover:bg-[#E6EDF3]"
                >
                  {row}
                </a>
              ) : (
                <div key={a.id} className="flex items-center gap-2 rounded-lg bg-[#F3F6F9] px-3 py-2">
                  {row}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* The request the task came from, in full — loaded on open under the
          request's own access rules (its handlers and the task's assignees
          can see it; a teammate who only sees the card gets nothing here). */}
      {task.requestId && (requestLoading || request) && (
        <div className="border-t border-gray-200 px-7 pb-6 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[13px] font-semibold text-gray-500">Request</span>
            {request && (
              <span className="font-mono text-xs text-gray-500">
                {request.typeLabel} · submitted {new Date(request.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}{' '}
                by {request.requesterId === userId ? 'you' : (request.requesterName ?? 'Anonymous')}
              </span>
            )}
          </div>

          {requestLoading ? (
            <div className="mt-3 flex flex-col gap-2" aria-busy="true">
              <span className="h-3 w-40 animate-pulse rounded bg-gray-100" />
              <span className="h-3 w-64 animate-pulse rounded bg-gray-100" />
              <span className="h-3 w-52 animate-pulse rounded bg-gray-100" />
            </div>
          ) : (
            request && (
              <>
                <RequestAnswers
                  answers={request.answers}
                  files={request.attachments}
                  onDownload={(file) => downloadFile(request.id, file)}
                />
                {fileError && (
                  <p role="alert" className="mt-2 text-xs font-bold text-[#8B2E38]">
                    {fileError}
                  </p>
                )}
              </>
            )
          )}
        </div>
      )}
    </Dialog>
  );
}
