'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EventRow from "@/components/EventRow";
import StatCard from "@/components/StatCard";
import TaskRow from "@/components/TaskRow";
import AnnouncementRow from "@/components/AnnouncementRow";
import WelcomeHeading from "@/components/WelcomeHeading";
import StaggerReveal from "@/components/StaggerReveal";
import { getEvents } from '@/services/events-api';
import { getTasks } from '@/services/tasks-api';
import { getAnnouncements } from '@/services/announcements-api';
import { toUpcomingEventRows, toOpenTaskRows, toRecentAnnouncements, toDashboardStats } from "@/services/dashboard";
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';
import type { EventItem } from '@/types/events';
import type { TaskItem } from '@/types/tasks';
import type { AnnouncementItem } from '@/types/announcements';
import type { EventRowData } from "@/types/dashboard";

/* Events are already sorted by date/time ascending, so same-day events end
   up adjacent — collapsing them under one date chip, ordered by time. */
function groupEventsByDay(events: EventRowData[]) {
  const groups: { month: string; day: number; events: EventRowData[] }[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.month === event.month && last.day === event.day) {
      last.events.push(event);
    } else {
      groups.push({ month: event.month, day: event.day, events: [event] });
    }
  }
  return groups;
}

const UPCOMING_EVENTS_LIMIT = 20;
const OPEN_TASKS_LIMIT = 20;

/* Client-side, not server-rendered: tasks and announcements now carry
   per-user data (whose task it is, whether *I* liked this), which needs the
   JWT held in sessionStorage — a Server Component can't reach that. Same
   pattern as DocumentsView/AdminView. */
export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  const load = useCallback(async (token: string) => {
    const [e, t, a] = await Promise.all([getEvents(), getTasks(token), getAnnouncements(token)]);
    setEvents(e);
    setTasks(t);
    setAnnouncements(a);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    load(token)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [router, load]);

  // Re-fetch after a task/event/announcement is created via the header's
  // "New" dialog, wherever on the dashboard shell that happens to be open.
  useEffect(() => {
    function handleChanged() {
      const token = sessionStorage.getItem('token');
      if (token) load(token).catch(() => {});
    }
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
  }, [load]);

  function handleTaskToggled(id: number, completed: boolean) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
  }

  function handleAnnouncementDeleted(id: number) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-[#8B2E38]">{error}</p>;

  const stats = toDashboardStats(tasks, events, announcements);
  const upcomingEvents = toUpcomingEventRows(events, UPCOMING_EVENTS_LIMIT);
  const openTasks = toOpenTaskRows(tasks, OPEN_TASKS_LIMIT);
  const recentAnnouncements = toRecentAnnouncements(announcements);
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return (
    <div className="flex justify-center items-start gap-20">
      {/* LEFT COLUMN */}
      <div className="max-w-2xl flex-1">
        <WelcomeHeading />

        {/* UPPER BOX SECTION */}
        <StaggerReveal className="mt-6 flex flex-wrap justify-evenly gap-5" y={18}>
          <StatCard
            label={"OPEN TASKS"}
            value={stats.openTasks}
            colour={"#F4EFD3"}
          />
          <StatCard
            label={"UPCOMING EVENTS"}
            value={stats.upcomingEvents}
            colour={"#B1C9DC"}
          />
          <StatCard
            label={"NEW ANNOUNCEMENTS"}
            value={stats.newAnnouncements}
            colour={"#ED6672"}
          />
        </StaggerReveal>

        {/* ANNOUNCEMENTS SECTION */}
        <div className="mt-6">
          {recentAnnouncements.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center font-mono text-sm text-gray-400">
              No announcements yet.
            </p>
          ) : (
            <StaggerReveal className="flex flex-col gap-4" replayKey={recentAnnouncements.length}>
              {recentAnnouncements.map((announcement) => (
                <AnnouncementRow key={announcement.id} {...announcement} onDeleted={handleAnnouncementDeleted} />
              ))}
            </StaggerReveal>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="sticky top-0 -mt-8 flex w-80 shrink-0 flex-col gap-6">
        {/* EVENT ROW */}
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-2 bg-[#B1C9DC]" />
          <h2 className="bg-gray-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            Upcoming Events
          </h2>

          {upcomingEvents.length === 0 ? (
            <p className="border-t border-gray-200 px-4 py-6 text-center font-mono text-xs text-gray-400">
              None upcoming.
            </p>
          ) : (
            <StaggerReveal
              className="max-h-72 divide-y divide-gray-200 overflow-y-auto border-t border-gray-200"
              replayKey={upcomingEvents.length}
            >
              {groupEventsByDay(upcomingEvents).map((group) => (
                <EventRow
                  key={`${group.month}-${group.day}`}
                  month={group.month}
                  day={group.day}
                  events={group.events}
                />
              ))}
            </StaggerReveal>
          )}
        </div>

        {/* TASKS */}
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-2 bg-[#B1C9DC]" />
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              My tasks
            </h2>
          </div>

          {openTasks.length === 0 ? (
            <p className="border-t border-gray-200 px-4 py-6 text-center font-mono text-xs text-gray-400">
              None upcoming.
            </p>
          ) : (
            <StaggerReveal
              className="max-h-56 divide-y divide-gray-200 overflow-y-auto border-t border-gray-200"
              replayKey={openTasks.length}
            >
              {openTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  {...task}
                  completed={taskById.get(task.id)?.completed ?? false}
                  onToggled={handleTaskToggled}
                />
              ))}
            </StaggerReveal>
          )}
        </div>
      </div>
    </div>
  );
}
