import { Router } from 'express';
import {
  getTasksForUser,
  getTasksForPort,
  createTasks,
  updateTaskStatus,
  updateTaskDetails,
  getTaskById,
} from '../functions/tasks';
import { addTaskAttachment, getTaskAttachments, deleteTaskAttachment } from '../functions/task-attachments';
import { verifyAuthToken, type AuthedRequest } from '../middleware/auth';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler, created, ok, parseId } from '../lib/http';

const router = Router();

router.use(verifyAuthToken);

/**
 * GET /tasks?port=…
 * A port's board: every task with at least one assignee in that port.
 * Members of that port and admins only.
 */
router.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const port = req.query.port;
    if (typeof port !== 'string' || !port) throw new ValidationError('Missing required query param: port');

    ok(res, await getTasksForPort(port, req.user.userId));
  }),
);

/**
 * GET /tasks/mine
 * Lists every task the requesting user is an assignee on — backs the
 * dashboard's "My tasks" widget.
 */
router.get(
  '/mine',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await getTasksForUser(req.user.userId));
  }),
);

/**
 * POST /tasks
 * Creates one shared task, assigned to the requester themself, one or more
 * people, or everyone in a portfolio (see functions/tasks.ts's createTasks).
 * Body: { title, description?, dueDate?, assignTo, port?, assigneeIds?,
 * assigneeId? }.
 */
router.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { title, description, dueDate, assignTo, port, assigneeIds, assigneeId } = req.body as {
      title?: string;
      description?: string;
      dueDate?: string;
      assignTo?: 'me' | 'port' | 'person';
      port?: string;
      assigneeIds?: number[];
      assigneeId?: number;
    };

    if (assigneeIds !== undefined && (!Array.isArray(assigneeIds) || !assigneeIds.every(Number.isInteger))) {
      throw new ValidationError('assigneeIds must be an array of user ids');
    }
    if (!title || !assignTo) throw new ValidationError('Missing required fields: title, assignTo');

    const tasks = await createTasks({
      title,
      description,
      dueDate,
      assignTo,
      port,
      assigneeIds,
      assigneeId,
      requestedBy: req.user.userId,
    });

    created(res, tasks, { message: 'Task(s) created' });
  }),
);

/**
 * PATCH /tasks/:taskId
 * Moves a task to any task_status — the dashboard checkbox or a board
 * column; any of the task's assignees can. Or edits its title, description
 * or due date; only whoever created it can. Body: { status } and/or
 * { title?, description?, dueDate? } (null clears description or dueDate).
 */
router.patch(
  '/:taskId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const taskId = parseId(req.params.taskId, 'task');
    const { status, title, description, dueDate } = req.body as {
      status?: string;
      title?: string;
      description?: string | null;
      dueDate?: string | null;
    };
    const isEdit = title !== undefined || description !== undefined || dueDate !== undefined;
    if (!status && !isEdit) throw new ValidationError('Nothing to update');

    let task = isEdit ? await updateTaskDetails(taskId, req.user.userId, { title, description, dueDate }) : null;
    if (status) task = await updateTaskStatus(taskId, req.user.userId, status);
    if (!task) throw new NotFoundError('Task not found');

    ok(res, task);
  }),
);

/**
 * GET /tasks/:taskId
 * A single task's full details — assignee, creator or admin only. Backs the task
 * detail dialog.
 */
router.get(
  '/:taskId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const task = await getTaskById(parseId(req.params.taskId, 'task'), req.user.userId);
    if (!task) throw new NotFoundError('Task not found');
    ok(res, task);
  }),
);

/**
 * GET /tasks/:taskId/attachments
 */
router.get(
  '/:taskId/attachments',
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await getTaskAttachments(parseId(req.params.taskId, 'task'), req.user.userId));
  }),
);

/**
 * POST /tasks/:taskId/attachments
 * Records a file already uploaded straight to Google Drive from the
 * browser (see frontend/src/services/documents-api.ts's uploadDriveFile) —
 * this only ever receives the resulting Drive file's metadata, never the
 * file's actual bytes.
 */
router.post(
  '/:taskId/attachments',
  asyncHandler(async (req: AuthedRequest, res) => {
    const taskId = parseId(req.params.taskId, 'task');
    const { driveFileId, name, webViewLink, mimeType } = req.body as {
      driveFileId?: string;
      name?: string;
      webViewLink?: string | null;
      mimeType?: string | null;
    };
    if (!driveFileId || !name) throw new ValidationError('Missing required fields: driveFileId, name');

    const attachment = await addTaskAttachment(taskId, req.user.userId, {
      driveFileId,
      name,
      webViewLink: webViewLink ?? null,
      mimeType: mimeType ?? null,
    });
    created(res, attachment);
  }, 'Failed to add attachment'),
);

/**
 * DELETE /tasks/:taskId/attachments/:attachmentId
 * Only unlinks the attachment from the task — doesn't delete the underlying
 * Drive file, matching how the Documents page treats Drive-trash vs a
 * permanent delete (the file just stops being attached here).
 */
router.delete(
  '/:taskId/attachments/:attachmentId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const deleted = await deleteTaskAttachment(parseId(req.params.attachmentId, 'attachment'), req.user.userId);
    if (!deleted) throw new NotFoundError('Attachment not found');
    ok(res, undefined, { message: 'Attachment removed' });
  }),
);

export default router;
