import type { BoardTask, TaskAssignee, TaskItem, TaskStatus } from '@/types/tasks';
import type { CreateTaskInput, TaskDetailsEdit } from '@/services/tasks-api';
import { mockTasks } from '@/mocks/data/tasks';
import { mockBoardTasks } from '@/mocks/data/board-tasks';
import { mockProfile } from '@/mocks/data/auth';
import { mockDirectory } from '@/mocks/data/users';

/* A copy, not the live mockTasks array — see mocks/functions/announcements.ts's
   getAnnouncements for why: callers hold this in React state and compare by
   reference to decide whether to re-render. Leaves out anything cancelled on
   the board, same as the real getTasks in services/tasks-api.ts. */
export async function getTasks(): Promise<TaskItem[]> {
  const cancelled = new Set(mockBoardTasks.filter((t) => t.status === 'cancelled').map((t) => t.id));
  return mockTasks.filter((t) => !cancelled.has(t.id));
}

/* Unique across both mock sets, so a created task has the same id on the
   dashboard and the board. */
function mockId(): number {
  return Math.max(0, ...mockTasks.map((t) => t.id), ...mockBoardTasks.map((t) => t.id)) + 1;
}

/* The signed-in mock user is mockProfile; everyone else comes from the
   directory the composer's people picker lists. */
function mockPerson(id: number): TaskAssignee {
  if (id === mockProfile.id) {
    return { id, name: `${mockProfile.firstName} ${mockProfile.lastName}`, port: mockProfile.port };
  }
  const user = mockDirectory.find((u) => u.id === id);
  if (!user) throw new Error('Every assignee must be an active member');
  return { id, name: `${user.firstName} ${user.lastName}`, port: user.port };
}

function mockAssignees(input: CreateTaskInput): TaskAssignee[] {
  if (input.assignTo === 'me') return [mockPerson(mockProfile.id)];
  if (input.assignTo === 'port') {
    const ids = new Set(mockDirectory.filter((u) => u.port === input.port).map((u) => u.id));
    if (mockProfile.port === input.port) ids.add(mockProfile.id);
    if (ids.size === 0) throw new Error('No members currently hold that portfolio');
    return [...ids].map(mockPerson);
  }
  const ids = [...new Set(input.assigneeIds ?? [])];
  if (ids.length === 0) throw new Error('At least one person is required when assigning to people');
  return ids.map(mockPerson);
}

/* Mutates both mock sets directly (module-level, in-memory) so the dashboard
   and the board reflect a create/status-change immediately in local dev —
   resets on reload, same as every other in-memory mock in this app. One
   shared task whoever it's assigned to, and on the board of every port an
   assignee is in, matching the real backend. The dashboard list isn't
   filtered by assignee, so it shows every created task. */
export async function createTask(input: CreateTaskInput): Promise<TaskItem[]> {
  const assignees = mockAssignees(input);
  const id = mockId();
  const created: TaskItem = {
    id,
    name: input.title,
    description: input.description ?? null,
    dueAt: input.dueDate ?? null,
    completed: false,
    status: 'pending',
  };

  mockTasks.push(created);
  mockBoardTasks.push({
    id,
    title: created.name,
    description: created.description,
    status: 'pending',
    assignees,
    assignedBy: { id: mockProfile.id, name: `${mockProfile.firstName} ${mockProfile.lastName}` },
    dueAt: created.dueAt,
  });
  return [created];
}

/* Updates the task in whichever mock sets have it — a created task is in
   both — so a board drag or a dashboard tick sticks until reload. */
export async function updateTaskStatus(taskId: number, status: TaskStatus): Promise<TaskItem> {
  const boardTask = mockBoardTasks.find((t) => t.id === taskId);
  const task = mockTasks.find((t) => t.id === taskId);
  if (!boardTask && !task) throw new Error('Task not found');

  if (boardTask) boardTask.status = status;
  if (task) {
    task.completed = status === 'completed';
    task.status = status;
    return task;
  }
  return {
    id: boardTask!.id,
    name: boardTask!.title,
    description: boardTask!.description,
    dueAt: boardTask!.dueAt,
    completed: status === 'completed',
    status,
  };
}

export async function getTask(taskId: number): Promise<TaskItem> {
  const task = mockTasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  return task;
}

/* A dashboard-only mock task has no board row; it reads as one the mock
   user made for themself. */
export async function getBoardTask(taskId: number): Promise<BoardTask> {
  const boardTask = mockBoardTasks.find((t) => t.id === taskId);
  if (boardTask) return { ...boardTask };
  const task = mockTasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');
  const me = mockPerson(mockProfile.id);
  return {
    id: task.id,
    title: task.name,
    description: task.description,
    status: task.status,
    assignees: [me],
    assignedBy: { id: me.id, name: me.name },
    dueAt: task.dueAt,
  };
}

export async function updateTaskDetails(taskId: number, edit: TaskDetailsEdit): Promise<BoardTask> {
  const current = await getBoardTask(taskId);
  if (current.assignedBy?.id !== mockProfile.id) throw new Error('Only the person who created this task can edit it');
  const task = mockTasks.find((t) => t.id === taskId);
  if (task) Object.assign(task, { name: edit.title, description: edit.description, dueAt: edit.dueDate });
  const boardTask = mockBoardTasks.find((t) => t.id === taskId);
  if (boardTask) Object.assign(boardTask, { title: edit.title, description: edit.description, dueAt: edit.dueDate });
  return { ...current, title: edit.title, description: edit.description, dueAt: edit.dueDate };
}

/* Same rule as the real GET /tasks?port=…: any assignee in the port. A copy
   of each row, so the board's optimistic moves don't reach in here. */
/* Links each request-made card to its mock request by title, the way the
   real backend joins tasks.request_id — so the dialog shows the request's
   type pill, who sent it, and the request itself. */
export async function getBoardTasks(port: string): Promise<BoardTask[]> {
  const { mockRequests } = await import('@/mocks/data/requests');
  return mockBoardTasks
    .filter((task) => task.assignees.some((a) => a.port === port))
    .map((task) => {
      const request = task.requestTitle ? mockRequests.find((r) => r.title === task.requestTitle) : undefined;
      return request
        ? { ...task, requestId: request.id, requestType: request.requestType, requesterName: request.requesterName }
        : { ...task };
    });
}
