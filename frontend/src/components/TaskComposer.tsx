'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip, X } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import { createTask, addTaskAttachment } from '@/services/tasks-api';
import { getDriveDepartments, getDriveAccessToken, uploadDriveFile } from '@/services/documents-api';
import type { DirectoryUser } from '@/types/directory';
import type { DriveDepartment } from '@/types/documents';
import { PORT_OPTIONS } from '@/lib/ports';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';

export interface TaskComposerProps {
  open: boolean;
  directory: DirectoryUser[];
  onClose: () => void;
}

interface PendingAttachment {
  driveFileId: string;
  name: string;
  webViewLink: string | null;
  mimeType: string | null;
}

/* Bespoke rather than the generic FormDialog — same reasoning as
   EventComposer/AnnouncementComposer: attaching a file needs a real async
   Drive upload (pick a destination drive, upload, then link the result),
   which FormDialog's declarative fields don't support. A file is uploaded
   to Drive as soon as it's picked (so a slow upload doesn't block the rest
   of the form), then linked to whichever task(s) get created on submit —
   'port' assignment fans out to one task per member, so every one of them
   gets every attachment. */
export default function TaskComposer({ open, directory, onClose }: TaskComposerProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [nameMissing, setNameMissing] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assignTo, setAssignTo] = useState<'me' | 'port' | 'person'>('me');
  const [port, setPort] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [departments, setDepartments] = useState<DriveDepartment[]>([]);
  const [driveId, setDriveId] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setNameMissing(false);
    setDescription('');
    setDueDate('');
    setDueTime('');
    setAssignTo('me');
    setPort('');
    setAssigneeId('');
    setPendingAttachments([]);
    setError('');

    const token = sessionStorage.getItem('token');
    if (token) {
      getDriveDepartments(token)
        .then(({ departments: depts }) => {
          setDepartments(depts);
          const firstDrive = depts.flatMap((d) => d.drives)[0];
          if (firstDrive) setDriveId(firstDrive.id);
        })
        .catch(() => {});
    }
  }, [open]);

  async function handleFilePicked(file: File | undefined) {
    if (!file || !driveId) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setUploading(true);
    setError('');
    try {
      const { accessToken } = await getDriveAccessToken(token);
      const uploaded = await uploadDriveFile(accessToken, driveId, undefined, file);
      setPendingAttachments((prev) => [
        ...prev,
        { driveFileId: uploaded.id, name: uploaded.name, webViewLink: uploaded.webViewLink, mimeType: uploaded.mimeType },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  function removePendingAttachment(driveFileId: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.driveFileId !== driveFileId));
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameMissing(true);
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await createTask(token, {
        title: trimmedName,
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : undefined,
        assignTo,
        port: assignTo === 'port' ? port : undefined,
        assigneeId: assignTo === 'person' && assigneeId ? Number(assigneeId) : undefined,
      });

      if (pendingAttachments.length > 0) {
        await Promise.all(
          created.flatMap((task) => pendingAttachments.map((a) => addTaskAttachment(token, task.id, a)))
        );
      }

      window.dispatchEvent(new Event(DASHBOARD_DATA_CHANGED_EVENT));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyles =
    'w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]';
  const labelStyles = 'text-xs font-bold uppercase tracking-wide text-gray-500';
  const drives = departments.flatMap((d) => d.drives.map((drive) => ({ ...drive, department: d.name })));

  return (
    <Dialog open={open} title="New task" size="2xl" onClose={onClose}>
      <div className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelStyles}>
            Task name <span className="text-[#ED6672]">*</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameMissing(false);
            }}
            className={`${inputStyles} ${nameMissing ? 'ring-2 ring-[#ED6672]' : ''}`}
          />
          {nameMissing && (
            <span role="alert" className="text-xs font-bold text-[#ED6672]">
              Task name is required
            </span>
          )}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelStyles}>Due date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputStyles} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelStyles}>Due time</span>
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={inputStyles} />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelStyles}>Assign to</span>
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            {(['me', 'port', 'person'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAssignTo(opt)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  assignTo === opt ? 'bg-[#B1C9DC] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {opt === 'me' ? 'Just me' : opt === 'port' ? 'A port' : 'A person'}
              </button>
            ))}
          </div>
        </label>

        {assignTo === 'port' && (
          <label className="flex flex-col gap-1.5">
            <span className={labelStyles}>Which port</span>
            <select value={port} onChange={(e) => setPort(e.target.value)} className={inputStyles}>
              <option value="">Select a port...</option>
              {PORT_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {assignTo === 'person' && (
          <label className="flex flex-col gap-1.5">
            <span className={labelStyles}>Who</span>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputStyles}>
              <option value="">Select a member...</option>
              {directory.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={labelStyles}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputStyles} resize-none`}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className={labelStyles}>Attachments</span>

          {pendingAttachments.map((a) => (
            <div key={a.driveFileId} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="flex-1 truncate text-sm font-bold text-gray-700">{a.name}</span>
              <button
                onClick={() => removePendingAttachment(a.driveFileId)}
                className="shrink-0 text-gray-400 hover:text-[#8B2E38]"
                aria-label={`Remove ${a.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {drives.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                value={driveId}
                onChange={(e) => setDriveId(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-700"
              >
                {drives.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.department} / {d.name}
                  </option>
                ))}
              </select>
              <label className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-[#3D6C94] transition-colors hover:bg-gray-50">
                {uploading ? 'Uploading…' : 'Attach a file'}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleFilePicked(e.target.files?.[0])}
                />
              </label>
            </div>
          ) : (
            <p className="font-mono text-xs text-gray-400">
              Connect Google Drive (sign out and back in with Google) to attach files.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs font-bold text-[#ED6672]">
            {error}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
