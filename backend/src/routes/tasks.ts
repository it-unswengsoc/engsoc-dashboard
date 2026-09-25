import { Router, Request, Response } from 'express';
import { getTasksForUser, createTasks, updateTaskStatus, ForbiddenTaskError } from '../functions/tasks';
import { verifyAuthToken } from './auth';

const router = Router();

/**
 * GET /tasks/mine
 * Lists every task assigned to the requesting user — backs the dashboard's
 * "My tasks" widget.
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
 * Creates a task, assigned to the requester themself, a specific person, or
 * everyone in a portfolio (see functions/tasks.ts's createTasks for how
 * that last one fans out). Body: { title, description?, dueDate?, assignTo,
 * port?, assigneeId? }.
 */
router.post('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, dueDate, assignTo, port, assigneeId } = req.body as {
      title?: string;
      description?: string;
      dueDate?: string;
      assignTo?: 'me' | 'port' | 'person';
      port?: string;
      assigneeId?: number;
    };

    if (!title || !assignTo) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields: title, assignTo' });
    }

    const tasks = await createTasks({
      title,
      description,
      dueDate,
      assignTo,
      port,
      assigneeId,
      requestedBy: user.userId,
    });

    res.status(201).json({ status: 'success', message: 'Task(s) created', data: tasks });
  } catch (error) {
    // createTasks only throws for invalid input — a DB failure resolves a
    // row to null and is simply omitted from the result, same as events.ts.
    console.error('Create task error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create task',
    });
  }
});

/**
 * PATCH /tasks/:taskId
 * Updates a task's status — the dashboard checkbox. Only the assignee can
 * update their own task. Body: { status }.
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

    const task = await updateTaskStatus(taskId, user.userId, status as any);
    if (!task) {
      return res.status(404).json({ status: 'error', message: 'Task not found' });
    }

    res.status(200).json({ status: 'success', data: task });
  } catch (error) {
    if (error instanceof ForbiddenTaskError) {
      return res.status(403).json({ status: 'error', message: error.message });
    }
    console.error('Update task error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
