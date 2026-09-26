import type { TaskItem } from '@/types/tasks';
import type { CreateTaskInput } from '@/services/tasks-api';
import { mockTasks } from '@/mocks/data/tasks';
import { mockDirectory } from '@/mocks/data/users';

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
   reload, same as every other in-memory mock in this app. Mirrors the real
   backend's port-fan-out: assigning to a port creates one task per member
   of it (here, everyone in mockDirectory with that port — the mock user
   themself, "me", doesn't map to a specific directory row, so only 'port'
   assignment actually fans out in this mock). */
export async function createTask(input: CreateTaskInput): Promise<TaskItem[]> {
  const targets =
    input.assignTo === 'port' ? mockDirectory.filter((u) => u.port === input.port).map(() => mockId()) : [mockId()];

  const created: TaskItem[] = targets.map((id, i) => ({
    id: id + i,
    name: input.title,
    description: input.description ?? null,
    dueAt: input.dueDate ?? null,
    completed: false,
  }));

  mockTasks.push(...created);
  return created;
}

export async function updateTaskStatus(taskId: number, status: 'pending' | 'completed'): Promise<TaskItem> {
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
