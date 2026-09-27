import type { BoardTask, TaskItem, TaskStatus } from '@/types/tasks';
import type { CreateTaskInput } from '@/services/tasks-api';
import { mockTasks } from '@/mocks/data/tasks';
import { mockBoardTasks } from '@/mocks/data/board-tasks';

/* A copy, not the live mockTasks array — see mocks/functions/announcements.ts's
   getAnnouncements for why: callers hold this in React state and compare by
   reference to decide whether to re-render. */
export async function getTasks(): Promise<TaskItem[]> {
  return mockTasks.slice();
}

function mockId(): number {
  return Math.max(0, ...mockTasks.map((t) => t.id)) + 1;
}

/* Mutates mockTasks directly (module-level, in-memory) so the dashboard
   reflects a create/status-change immediately in local dev — resets on
   reload, same as every other in-memory mock in this app. One shared task
   whoever it's assigned to, matching the real backend. */
export async function createTask(input: CreateTaskInput): Promise<TaskItem[]> {
  const created: TaskItem = {
    id: mockId(),
    name: input.title,
    description: input.description ?? null,
    dueAt: input.dueDate ?? null,
    completed: false,
  };

  mockTasks.push(created);
  return [created];
}

/* Looks through both mock sets, so a board drag sticks until reload — the
   board's ids start at 101 to keep the two apart. */
export async function updateTaskStatus(taskId: number, status: TaskStatus): Promise<TaskItem> {
  const boardTask = mockBoardTasks.find((t) => t.id === taskId);
  if (boardTask) {
    boardTask.status = status;
    return {
      id: boardTask.id,
      name: boardTask.title,
      description: boardTask.description,
      dueAt: boardTask.dueAt,
      completed: status === 'completed',
    };
  }

  const task = mockTasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  task.completed = status === 'completed';
  return task;
}

export async function getTask(taskId: number): Promise<TaskItem> {
  const task = mockTasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  return task;
}

/* Same rule as the real GET /tasks?port=…: any assignee in the port. A copy
   of each row, so the board's optimistic moves don't reach in here. */
export async function getBoardTasks(port: string): Promise<BoardTask[]> {
  return mockBoardTasks
    .filter((task) => task.assignees.some((a) => a.port === port))
    .map((task) => ({ ...task }));
}
