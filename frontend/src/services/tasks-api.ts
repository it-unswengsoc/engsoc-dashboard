import type { BoardTask, TaskItem } from '@/types/tasks';

export type { BoardTask, TaskItem };

/* Always mock, regardless of NEXT_PUBLIC_USE_MOCK — the tasks table exists
   (see database/create-tables.sql) but no /tasks route is mounted, so a real
   fetch would 404. Swap to apiUrl('/tasks') once that route lands. */
export async function getTasks(): Promise<TaskItem[]> {
  const { getTasks: mockGetTasks } = await import('@/mocks/functions/tasks');
  return mockGetTasks();
}

/* The board's fuller rows. Becomes GET /tasks?port=… once a route exists —
   though the tasks table has no port column to filter on yet, so a port-wide
   board needs that adding before this can be real. */
export async function getBoardTasks(): Promise<BoardTask[]> {
  const { getBoardTasks: mockGetBoardTasks } = await import('@/mocks/functions/tasks');
  return mockGetBoardTasks();
}
