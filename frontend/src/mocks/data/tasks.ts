import type { TaskItem } from '@/types/tasks';
import { at } from '@/mocks/data/date-helpers';

export const mockTasks: TaskItem[] = [
  {
    id: 1,
    name: 'finish wireframe',
    description: 'Rough out the new dashboard layout before Friday\'s review.',
    dueAt: at(0, '21:30'),
    completed: false,
  },
  {
    id: 2,
    name: 'port meeting',
    description: null,
    dueAt: at(3, '21:30'),
    completed: false,
  },
  {
    id: 3,
    name: 'team call',
    description: null,
    dueAt: at(12, '21:30'),
    completed: false,
  },
  {
    id: 4,
    name: 'send sponsor deck',
    description: null,
    dueAt: at(-6, '17:00'),
    completed: true,
  },
  {
    id: 5,
    name: 'book venue',
    description: null,
    dueAt: at(-2, '17:00'),
    completed: true,
  },
  {
    id: 6,
    name: 'order name badges',
    description: null,
    dueAt: at(5, '12:00'),
    completed: false,
  },
  {
    id: 7,
    name: 'confirm catering',
    description: null,
    dueAt: at(8, '10:00'),
    completed: false,
  },
];
