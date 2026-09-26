import { Router, Request, Response } from 'express';
import {
  getTasksForUser,
  getTasksForPort,
  createTasks,
  updateTaskStatus,
  getTaskById,
  ForbiddenTaskError,
  InvalidTaskStatusError,
} from '../functions/tasks';
import { addTaskAttachment, getTaskAttachments, deleteTaskAttachment } from '../functions/task-attachments';
import { verifyAuthToken } from './auth';

const router = Router();

/**
 * GET /tasks?port=…
 * A port's board: every task with at least one assignee in that port.
 * Members of that port and admins only.
 */
router.get('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const port = req.query.port;
    if (typeof port !== 'string' || !port) {
      return res.status(400).json({ status: 'error', message: 'Missing required query param: port' });
    }

    const tasks = await getTasksForPort(port, user.userId);
    res.status(200).json({ status: 'success', data: tasks });
  } catch (error) {
    if (error instanceof ForbiddenTaskError) {
      return res.status(403).json({ status: 'error', message: error.message });
    }
    if (error instanceof Error && error.message === 'Unknown portfolio') {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    console.error('Get port tasks error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * GET /tasks/mine
 * Lists every task the requesting user is an assignee on — backs the
 * dashboard's "My tasks" widget.
 */
router.get('/mine', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tasks = await getTasksForUser(user.userId);
    res.status(200).json({ status: 'success', data: tasks });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * POST /tasks
 * Creates one shared task, assigned to the requester themself, one or more
 * people, or everyone in a portfolio (see functions/tasks.ts's createTasks).
 * Body: { title, description?, dueDate?, assignTo, port?, assigneeIds?,
 * assigneeId? }.
 */
router.post('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
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
      return res.status(400).json({ status: 'error', message: 'assigneeIds must be an array of user ids' });
    }

    if (!title || !assignTo) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields: title, assignTo' });
    }

    const tasks = await createTasks({
      title,
      description,
      dueDate,
      assignTo,
      port,
      assigneeIds,
      assigneeId,
      requestedBy: user.userId,
    });

    res.status(201).json({ status: 'success', message: 'Task(s) created', data: tasks });
  } catch (error) {
    // Mostly invalid input — createTasks' validation messages are written
    // for the member to read.
    console.error('Create task error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create task',
    });
  }
});

/**
 * PATCH /tasks/:taskId
 * Moves a task to any task_status — the dashboard checkbox or a board
 * column. Any of the task's assignees can move it. Body: { status }.
 */
router.patch('/:taskId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    const { status } = req.body as { status?: string };

    if (isNaN(taskId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID' });
    }
    if (!status) {
      return res.status(400).json({ status: 'error', message: 'Missing required field: status' });
    }

    const task = await updateTaskStatus(taskId, user.userId, status);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    res.status(200).json({ status: 'success', data: task });
  } catch (error) {
    if (error instanceof ForbiddenTaskError) {
      return res.status(403).json({ status: 'error', message: error.message });
    }
    if (error instanceof InvalidTaskStatusError) {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    console.error('Update task error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * GET /tasks/:taskId
 * A single task's full details — assignee or admin only. Backs the task
 * detail dialog.
 */
router.get('/:taskId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    if (isNaN(taskId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID' });
    }

    const task = await getTaskById(taskId, user.userId);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    res.status(200).json({ status: 'success', data: task });
  } catch (error) {
    if (error instanceof ForbiddenTaskError) {
      return res.status(403).json({ status: 'error', message: error.message });
    }
    console.error('Get task error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * GET /tasks/:taskId/attachments
 */
router.get('/:taskId/attachments', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    if (isNaN(taskId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID' });
    }

    const attachments = await getTaskAttachments(taskId, user.userId);
    res.status(200).json({ status: 'success', data: attachments });
  } catch (error) {
    if (error instanceof ForbiddenTaskError) {
      return res.status(403).json({ status: 'error', message: error.message });
    }
    console.error('Get task attachments error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * POST /tasks/:taskId/attachments
 * Records a file already uploaded straight to Google Drive from the
 * browser (see frontend/src/services/documents-api.ts's uploadDriveFile) —
 * this only ever receives the resulting Drive file's metadata, never the
 * file's actual bytes.
 */
router.post('/:taskId/attachments', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const user = (req as any).user;
    const { driveFileId, name, webViewLink, mimeType } = req.body as {
      driveFileId?: string;
      name?: string;
      webViewLink?: string | null;
      mimeType?: string | null;
    };

    if (isNaN(taskId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid task ID' });
    }
    if (!driveFileId || !name) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields: driveFileId, name' });
    }

    const attachment = await addTaskAttachment(taskId, user.userId, {
      driveFileId,
      name,
      webViewLink: webViewLink ?? null,
      mimeType: mimeType ?? null,
    });
    res.status(201).json({ status: 'success', data: attachment });
  } catch (error) {
    if (error instanceof ForbiddenTaskError) {
      return res.status(403).json({ status: 'error', message: error.message });
    }
    console.error('Add task attachment error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to add attachment',
    });
  }
});

/**
 * DELETE /tasks/:taskId/attachments/:attachmentId
 * Only unlinks the attachment from the task — doesn't delete the underlying
 * Drive file, matching how the Documents page treats Drive-trash vs a
 * permanent delete (the file just stops being attached here).
 */
router.delete('/:taskId/attachments/:attachmentId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const user = (req as any).user;
    if (isNaN(attachmentId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid attachment ID' });
    }

    const deleted = await deleteTaskAttachment(attachmentId, user.userId);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Attachment not found' });
    }

    res.status(200).json({ status: 'success', message: 'Attachment removed' });
  } catch (error) {
    if (error instanceof ForbiddenTaskError) {
      return res.status(403).json({ status: 'error', message: error.message });
    }
    console.error('Delete task attachment error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
