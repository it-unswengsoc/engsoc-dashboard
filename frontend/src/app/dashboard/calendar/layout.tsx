import { getTasks } from '@/services/tasks-api';
import { getOpenTasks } from '@/services/dashboard';
import { toTaskCalendarItems } from '@/lib/calendar';
import CalendarShell from '@/components/calendar/CalendarShell';

/* Fetches live task data server-side; the deployment's own URL doesn't exist
   yet at build time, so this can't be statically prerendered. Events come
   from the signed-in member's own Google Calendar instead of Postgres now —
   fetched client-side in CalendarShell, since that needs the JWT held in
   the browser's sessionStorage, which a Server Component can't reach. */
export const dynamic = 'force-dynamic';

export default async function CalendarLayout({ children }: { children: React.ReactNode }) {
  const [tasks, dueTasks] = await Promise.all([
    getTasks(),
    getOpenTasks(5),
  ]);

  const taskItems = toTaskCalendarItems(tasks);

  return (
    <CalendarShell taskItems={taskItems} dueTasks={dueTasks}>
      {children}
    </CalendarShell>
  );
}
