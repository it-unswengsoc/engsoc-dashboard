import type { TaskItem } from '@/types/tasks';

export type { TaskItem };

/* Always mock, regardless of NEXT_PUBLIC_USE_MOCK — the tasks table exists
   (see database/create-tables.sql) but no /tasks route is mounted, so a real
   fetch would 404. Swap to apiUrl('/tasks') once that route lands. */
export async function getTasks(): Promise<TaskItem[]> {
  const { getTasks: mockGetTasks } = await import('@/mocks/functions/tasks');
  return mockGetTasks();
}
