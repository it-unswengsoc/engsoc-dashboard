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

/* Generic pulsing placeholder bar — composed into the section skeletons
   below, each sized to roughly match its real row so nothing jumps once
   the real data swaps in. */
function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function StatCardSkeleton({ colour }: { colour: string }) {
  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: colour, opacity: 0.35 }} />
      <div className="px-4 py-4">
        <SkeletonBar className="mb-2.5 h-3 w-20" />
        <SkeletonBar className="h-7 w-10" />
      </div>
    </div>
  );
}

function AnnouncementRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <SkeletonBar className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1">
          <SkeletonBar className="mb-1.5 h-3.5 w-40" />
          <SkeletonBar className="h-2.5 w-20" />
        </div>
      </div>
      <div className="px-4 py-4">
        <SkeletonBar className="mb-2 h-3 w-full" />
        <SkeletonBar className="h-3 w-5/6" />
      </div>
    </div>
  );
}

function EventRowSkeleton() {
  return (
    <div className="flex items-start gap-2.5 px-3 py-3.5">
      <SkeletonBar className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-1.5">
        <SkeletonBar className="h-3.5 w-32" />
        <SkeletonBar className="h-2.5 w-20" />
      </div>
    </div>
  );
}

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-3.5">
      <SkeletonBar className="h-5 w-5 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-1.5">
        <SkeletonBar className="h-3.5 w-28" />
        <SkeletonBar className="h-2.5 w-16" />
      </div>
    </div>
  );
}

interface Fetched<T> {
  data: T[];
  loading: boolean;
  error: string;
}

const INITIAL_FETCHED = { data: [], loading: true, error: '' };

/* Client-side, not server-rendered: tasks and announcements now carry
   per-user data (whose task it is, whether *I* liked this), which needs the
   JWT held in sessionStorage — a Server Component can't reach that. Same
   pattern as DocumentsView/AdminView.

   Events, tasks, and announcements are fetched independently rather than
   behind one shared Promise.all — each section now renders (or shows its
   own skeleton) the moment its own request resolves, instead of the whole
   page staying blank on a single "Loading…" line until the slowest of the
   three finishes. */
export default function HomePage() {
  const router = useRouter();

  const [eventsState, setEventsState] = useState<Fetched<EventItem>>(INITIAL_FETCHED);
  const [tasksState, setTasksState] = useState<Fetched<TaskItem>>(INITIAL_FETCHED);
  const [announcementsState, setAnnouncementsState] = useState<Fetched<AnnouncementItem>>(INITIAL_FETCHED);

  const load = useCallback((token: string) => {
    setEventsState((s) => ({ ...s, loading: true, error: '' }));
    getEvents()
      .then((data) => setEventsState({ data, loading: false, error: '' }))
      .catch((err) =>
        setEventsState({ data: [], loading: false, error: err instanceof Error ? err.message : 'Failed to load events' })
      );

    setTasksState((s) => ({ ...s, loading: true, error: '' }));
    getTasks(token)
      .then((data) => setTasksState({ data, loading: false, error: '' }))
      .catch((err) =>
        setTasksState({ data: [], loading: false, error: err instanceof Error ? err.message : 'Failed to load tasks' })
      );

    setAnnouncementsState((s) => ({ ...s, loading: true, error: '' }));
    getAnnouncements(token)
      .then((data) => setAnnouncementsState({ data, loading: false, error: '' }))
      .catch((err) =>
        setAnnouncementsState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load announcements',
        })
      );
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    load(token);
  }, [router, load]);

  // Re-fetch after a task/event/announcement is created via the header's
  // "New" dialog, wherever on the dashboard shell that happens to be open.
  useEffect(() => {
    function handleChanged() {
      const token = sessionStorage.getItem('token');
      if (token) load(token);
    }
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
  }, [load]);

  function handleTaskToggled(id: number, completed: boolean) {
    setTasksState((s) => ({ ...s, data: s.data.map((t) => (t.id === id ? { ...t, completed } : t)) }));
  }

  function handleAnnouncementDeleted(id: number) {
    setAnnouncementsState((s) => ({ ...s, data: s.data.filter((a) => a.id !== id) }));
  }

  const { data: events, loading: eventsLoading, error: eventsError } = eventsState;
  const { data: tasks, loading: tasksLoading, error: tasksError } = tasksState;
  const { data: announcements, loading: announcementsLoading, error: announcementsError } = announcementsState;

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
          {tasksLoading ? (
            <StatCardSkeleton colour="#F4EFD3" />
          ) : (
            <StatCard label={"OPEN TASKS"} value={stats.openTasks} colour={"#F4EFD3"} />
          )}
          {eventsLoading ? (
            <StatCardSkeleton colour="#B1C9DC" />
          ) : (
            <StatCard label={"UPCOMING EVENTS"} value={stats.upcomingEvents} colour={"#B1C9DC"} />
          )}
          {announcementsLoading ? (
            <StatCardSkeleton colour="#ED6672" />
          ) : (
            <StatCard label={"NEW ANNOUNCEMENTS"} value={stats.newAnnouncements} colour={"#ED6672"} />
          )}
        </StaggerReveal>

        {/* ANNOUNCEMENTS SECTION */}
        <div className="mt-6">
          {announcementsLoading ? (
            <div className="flex flex-col gap-4">
              <AnnouncementRowSkeleton />
              <AnnouncementRowSkeleton />
            </div>
          ) : announcementsError ? (
            <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center font-mono text-sm text-[#8B2E38]">
              {announcementsError}
            </p>
          ) : recentAnnouncements.length === 0 ? (
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

          {eventsLoading ? (
            <div className="divide-y divide-gray-200 border-t border-gray-200">
              <EventRowSkeleton />
              <EventRowSkeleton />
              <EventRowSkeleton />
            </div>
          ) : eventsError ? (
            <p className="border-t border-gray-200 px-4 py-6 text-center font-mono text-xs text-[#8B2E38]">
              {eventsError}
            </p>
          ) : upcomingEvents.length === 0 ? (
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

          {tasksLoading ? (
            <div className="divide-y divide-gray-200 border-t border-gray-200">
              <TaskRowSkeleton />
              <TaskRowSkeleton />
              <TaskRowSkeleton />
            </div>
          ) : tasksError ? (
            <p className="border-t border-gray-200 px-4 py-6 text-center font-mono text-xs text-[#8B2E38]">
              {tasksError}
            </p>
          ) : openTasks.length === 0 ? (
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
