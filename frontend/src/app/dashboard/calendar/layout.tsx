import { getEvents } from '@/services/events-api';
import { getTasks } from '@/services/tasks-api';
import { getOpenTasks } from '@/services/dashboard';
import { toCalendarItems } from '@/lib/calendar';
import CalendarShell from '@/components/calendar/CalendarShell';

/* Fetches live task/event data server-side; the deployment's own URL doesn't
   exist yet at build time, so this can't be statically prerendered. */
export const dynamic = 'force-dynamic';

export default async function CalendarLayout({ children }: { children: React.ReactNode }) {
  const [events, tasks, dueTasks] = await Promise.all([
    getEvents(),
    getTasks(),
    getOpenTasks(5),
  ]);

  const items = toCalendarItems(events, tasks);

  return (
    <CalendarShell items={items} dueTasks={dueTasks}>
      {children}
    </CalendarShell>
  );
}
