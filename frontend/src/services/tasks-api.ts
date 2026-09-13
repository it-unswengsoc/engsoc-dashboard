import type { TaskItem } from '@/types/tasks';

export type { TaskItem };

/* Always mock, regardless of NEXT_PUBLIC_USE_MOCK — there's no tasks table
   or backend route yet (unlike events/drive/auth, which are real). Wire
   this up to a real endpoint once a Tasks feature actually exists on the
   backend; until then this would just 404 in "real" mode. */
export async function getTasks(): Promise<TaskItem[]> {
  const { getTasks: mockGetTasks } = await import('@/mocks/functions/tasks');
  return mockGetTasks();
}
