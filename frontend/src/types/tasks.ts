export interface TaskItem {
  id: number;
  name: string;
  dueAt: string | null; // ISO date string; null if no due date was set
  completed: boolean;
}
