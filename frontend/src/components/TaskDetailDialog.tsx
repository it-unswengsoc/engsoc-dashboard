'use client';

import { useEffect, useState } from 'react';
import { Paperclip, Trash2, ExternalLink } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import {
  getTask,
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
  updateTaskStatus,
  type TaskItem,
  type TaskAttachment,
} from '@/services/tasks-api';
import { getDriveDepartments, getDriveAccessToken, uploadDriveFile } from '@/services/documents-api';
import type { DriveDepartment } from '@/types/documents';

export interface TaskDetailDialogProps {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onCompletionChanged?: (id: number, completed: boolean) => void;
}

/* Attaching a file uploads straight to a Shared Drive's root the member
   picks (reusing the exact upload dance documents-api.ts already has —
   getDriveAccessToken + uploadDriveFile), then records the result against
   this task. There's no folder browser here (unlike the Documents page) —
   picking a department/drive is enough for a task attachment; anyone who
   wants it organized further can move it in Drive itself afterwards. */
export default function TaskDetailDialog({ open, taskId, onClose, onCompletionChanged }: TaskDetailDialogProps) {
  const [task, setTask] = useState<TaskItem | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [departments, setDepartments] = useState<DriveDepartment[]>([]);
  const [driveId, setDriveId] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || taskId === null) return;
    setError('');
    setLoading(true);

    const token = sessionStorage.getItem('token');
    if (!token) return;

    Promise.all([getTask(token, taskId), getTaskAttachments(token, taskId), getDriveDepartments(token)])
      .then(([taskData, attachmentsData, { departments: depts }]) => {
        setTask(taskData);
        setAttachments(attachmentsData);
        setDepartments(depts);
        const firstDrive = depts.flatMap((d) => d.drives)[0];
        if (firstDrive) setDriveId(firstDrive.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load task'))
      .finally(() => setLoading(false));
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

  async function handleFilePicked(file: File | undefined) {
    if (!file || !task || !driveId) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setUploading(true);
    setError('');
    try {
      const { accessToken } = await getDriveAccessToken(token);
      const uploaded = await uploadDriveFile(accessToken, driveId, undefined, file);
      const attachment = await addTaskAttachment(token, task.id, {
        driveFileId: uploaded.id,
        name: uploaded.name,
        webViewLink: uploaded.webViewLink,
        mimeType: uploaded.mimeType,
      });
      setAttachments((prev) => [...prev, attachment]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach file');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAttachment(attachmentId: number) {
    if (!task) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const previous = attachments;
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId)); // optimistic
    try {
      await deleteTaskAttachment(token, task.id, attachmentId);
    } catch (err) {
      setAttachments(previous); // roll back
      setError(err instanceof Error ? err.message : 'Failed to remove attachment');
    }
  }

  const drives = departments.flatMap((d) => d.drives.map((drive) => ({ ...drive, department: d.name })));

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

              {drives.length > 0 ? (
                <div className="mt-1 flex items-center gap-2">
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
