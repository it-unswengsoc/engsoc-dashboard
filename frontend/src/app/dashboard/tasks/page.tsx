import { getBoardTasks } from '@/services/tasks-api';
import { getCurrentUser } from '@/services/requests-api';
import TasksBoard from '@/components/tasks/TasksBoard';

/* TODO: read the viewer's port instead. users.port exists, but getProfile
   doesn't return it — and tasks have no port column to filter on regardless. */
const VIEWER_PORT = 'publication';

export default async function TasksPage() {
  const [tasks, currentUser] = await Promise.all([getBoardTasks(VIEWER_PORT), getCurrentUser()]);

  return <TasksBoard tasks={tasks} currentUser={currentUser} port={VIEWER_PORT} />;
}
