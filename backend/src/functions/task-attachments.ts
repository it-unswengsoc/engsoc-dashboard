import {
  dbGetTaskAttachments,
  dbAddTaskAttachment,
  dbGetTaskAttachmentTaskId,
  dbDeleteTaskAttachment,
  type TaskAttachment,
} from '../database/task-attachments';
import { dbGetTaskById } from '../database/tasks';
import { isUserAdmin } from './admin';
import { ForbiddenTaskError } from './tasks';

export type { TaskAttachment };

async function canAccessTask(taskId: number, userId: number): Promise<boolean> {
  const task = await dbGetTaskById(taskId);
  if (!task) return false;
  if (task.assignedTo === userId) return true;
  return isUserAdmin(userId);
}

/* The file's actual bytes are already on Google Drive by the time this runs
   (the frontend uploads straight to Drive with the signed-in member's own
   access token — see services/documents-api.ts's uploadDriveFile) — this
   just records that Drive file against the task. */
export async function addTaskAttachment(
  taskId: number,
  userId: number,
  input: { driveFileId: string; name: string; webViewLink: string | null; mimeType: string | null }
): Promise<TaskAttachment> {
  if (!(await canAccessTask(taskId, userId))) {
    throw new ForbiddenTaskError('You can only attach files to your own tasks');
  }
  return dbAddTaskAttachment({ taskId, addedBy: userId, ...input });
}

export async function getTaskAttachments(taskId: number, userId: number): Promise<TaskAttachment[]> {
  if (!(await canAccessTask(taskId, userId))) {
    throw new ForbiddenTaskError('You can only view your own tasks');
  }
  return dbGetTaskAttachments(taskId);
}

export async function deleteTaskAttachment(attachmentId: number, userId: number): Promise<boolean> {
  const taskId = await dbGetTaskAttachmentTaskId(attachmentId);
  if (taskId === null) return false;
  if (!(await canAccessTask(taskId, userId))) {
    throw new ForbiddenTaskError('You can only remove attachments from your own tasks');
  }
  return dbDeleteTaskAttachment(attachmentId);
}
