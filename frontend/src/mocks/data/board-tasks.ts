import type { BoardTask, TaskAssignee } from '@/types/tasks';
import { at } from '@/mocks/data/date-helpers';
import { mockMembers } from '@/mocks/data/members';

const [riley, sam, alex, jordan, priya, dana] = mockMembers.map(
  (m): TaskAssignee => ({ id: m.id, name: m.name, port: m.port }),
);
const by = (a: TaskAssignee) => ({ id: a.id, name: a.name });

/* The Publications port's board. Spread across all four task_status values,
   with several on the current user (riley) so the "My tasks" filter has
   something to narrow to — including shared tasks, one for the whole port —
   and due dates spanning overdue / this week / later. Ids start at 101 so
   they never collide with mocks/data/tasks.ts, which updateTaskStatus's
   mock also looks through. */
export const mockBoardTasks: BoardTask[] = [
  {
    id: 101,
    title: 'Shoot Careers Night',
    description: 'Bring the 50mm. Sponsors arrive at 5:30 for the group shots.',
    status: 'pending',
    assignees: [riley, jordan],
    assignedBy: by(sam),
    dueAt: at(3, '18:00'),
    requestTitle: 'Careers Night 2026',
  },
  {
    id: 102,
    title: 'Storyboard the sponsor reel',
    description: 'Rough cut order before pulling last year’s footage.',
    status: 'pending',
    assignees: [alex],
    assignedBy: by(sam),
    dueAt: at(6, '17:00'),
    requestTitle: 'Sponsor reel for O-Week',
  },
  {
    id: 103,
    title: 'Book the studio for the handbook cover',
    description: null,
    status: 'pending',
    assignees: [priya],
    assignedBy: null,
    dueAt: at(12, '12:00'),
  },
  {
    id: 104,
    title: 'Edit trivia night photos',
    description: 'Colour grade and cull to roughly 40 keepers.',
    status: 'in_progress',
    assignees: [riley],
    assignedBy: by(sam),
    dueAt: at(-1, '19:00'),
    requestTitle: 'Trivia night photos',
  },
  {
    id: 105,
    title: 'Cut the BBQ recap video',
    description: null,
    status: 'in_progress',
    assignees: [jordan],
    assignedBy: by(sam),
    dueAt: at(2, '12:00'),
    requestTitle: 'BESS x EngSoc BBQ',
  },
  {
    id: 106,
    title: 'Review the publications style guide',
    description: 'Everyone reads it and leaves comments before the term kicks off.',
    status: 'in_progress',
    assignees: [riley, sam, alex, jordan, priya, dana],
    assignedBy: by(sam),
    dueAt: at(9, '09:00'),
  },
  {
    id: 107,
    title: 'Export welcome week teaser',
    description: 'Fifteen seconds, square and vertical crops.',
    status: 'completed',
    assignees: [dana],
    assignedBy: by(sam),
    dueAt: at(-4, '09:00'),
    requestTitle: 'Welcome week teaser',
  },
  {
    id: 108,
    title: 'Publish director applications recap',
    description: null,
    status: 'completed',
    assignees: [alex, priya],
    assignedBy: null,
    dueAt: at(-8, '17:00'),
    requestTitle: 'Director applications recap',
  },
  {
    id: 109,
    title: 'Archive last term’s raw footage',
    description: null,
    status: 'completed',
    assignees: [riley],
    assignedBy: null,
    dueAt: at(-14, '16:00'),
  },
  {
    id: 110,
    title: 'Reshoot the handbook cover',
    description: 'Dropped when the request was rejected — studio was double booked.',
    status: 'cancelled',
    assignees: [priya],
    assignedBy: by(riley),
    dueAt: null,
    requestTitle: 'Handbook cover shoot',
  },
  // Request-linked, to show the task dialog's link buttons and Files row.
  {
    id: 111,
    title: 'Newsletter blast for the handbook',
    description: 'Send it on the 6th, once the print run lands.',
    status: 'in_progress',
    assignees: [riley],
    assignedBy: by(sam),
    dueAt: at(4, '09:00'),
    requestTitle: 'Newsletter blast for the handbook',
  },
  {
    id: 112,
    title: 'Sponsor lunch reimbursement',
    description: null,
    status: 'pending',
    assignees: [riley],
    assignedBy: by(riley),
    dueAt: null,
    requestTitle: 'Sponsor lunch reimbursement',
  },
];
