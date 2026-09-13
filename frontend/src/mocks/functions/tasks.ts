import type { TaskItem } from '@/types/tasks';
import { mockTasks } from '@/mocks/data/tasks';

export async function getTasks(): Promise<TaskItem[]> {
  return mockTasks;
}
