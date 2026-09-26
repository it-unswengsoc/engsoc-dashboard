export interface TaskItem {
  id: number;
  name: string;
  description: string | null;
  dueAt: string | null; // ISO date string; null if no due date was set
  completed: boolean;
}
