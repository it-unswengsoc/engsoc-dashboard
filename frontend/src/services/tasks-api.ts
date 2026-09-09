import type { TaskItem } from '@/types/tasks';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { TaskItem };

export async function getTasks(): Promise<TaskItem[]> {
  if (USE_MOCK) {
    const { getTasks: mockGetTasks } = await import('@/mocks/functions/tasks');
    return mockGetTasks();
  }

  const res = await fetch('/api/tasks');
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load tasks');
  return data.data;
}
