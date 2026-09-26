import type { BoardTask, TaskItem } from '@/types/tasks';
import { mockTasks } from '@/mocks/data/tasks';
import { mockBoardTasks } from '@/mocks/data/board-tasks';

export async function getTasks(): Promise<TaskItem[]> {
  return mockTasks;
}

export async function getBoardTasks(): Promise<BoardTask[]> {
  return mockBoardTasks;
}
