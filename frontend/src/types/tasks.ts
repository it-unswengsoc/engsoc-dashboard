export interface TaskItem {
  id: number;
  name: string;
  dueAt: string; // ISO date string
  completed: boolean;
}
