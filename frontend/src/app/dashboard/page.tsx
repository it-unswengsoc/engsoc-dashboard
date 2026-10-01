'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import EventRow from "@/components/EventRow";
import StatCard from "@/components/StatCard";
import TaskRow from "@/components/TaskRow";
import AnnouncementRow from "@/components/AnnouncementRow";
import WelcomeHeading from "@/components/WelcomeHeading";
import StaggerReveal from "@/components/StaggerReveal";
import { getDashboard, readCachedDashboard, writeCachedDashboard, type DashboardData } from '@/services/dashboard-api';
import { toUpcomingEventRows, toOpenTaskRows, toRecentAnnouncements, toDashboardStats } from "@/services/dashboard";
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';
import type { EventRowData } from "@/types/dashboard";
import type { TaskStatus } from "@/types/tasks";
import { toOfficialCalendarItem, type CalendarItem } from '@/lib/calendar';
import type { ComposerPrefill } from '@/components/calendar/CalendarContext';

/* Loaded on demand, only once an event is opened — same reasoning as
   TaskRow's TaskDetailDialog. */
const EventDetailModal = dynamic(() => import('@/components/calendar/EventDetailModal'), { ssr: false });
const EventComposer = dynamic(() => import('@/components/calendar/EventComposer'), { ssr: false });

type CalendarEvent = Extract<CalendarItem, { kind: 'event' }>;

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

/* sessionStorage throws in some private/locked-down modes; a missing
   token just means no cached dashboard to start from. */
function readToken(): string | null {
  try {
    return sessionStorage.getItem('token');
  } catch {
    return null;
  }
}

/* Client-side, not server-rendered: tasks and announcements now carry
   per-user data (whose task it is, whether *I* liked this), which needs the
   JWT held in sessionStorage — a Server Component can't reach that. Same
   pattern as DocumentsView/AdminView.

   Everything comes from one GET /dashboard, so the sections fill in
   together instead of one by one. The last dashboard this tab loaded is
   shown straight away while that request runs (see readCachedDashboard),
   so skeletons only show on the first visit. */
export default function HomePage() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(() => {
    const token = readToken();
    return token ? readCachedDashboard(token) : null;
  });
  const [error, setError] = useState('');
  /* Only the most recent load gets to set anything — a re-fetch after the
     "New" dialog can overlap the first load and finish before it. */
  const latestLoad = useRef(0);

  const load = useCallback((token: string) => {
    const loadId = ++latestLoad.current;
    getDashboard(token)
      .then((fresh) => {
        if (loadId !== latestLoad.current) return;
        setData(fresh);
        setError('');
      })
      .catch((err) => {
        if (loadId !== latestLoad.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      });
  }, []);

  useEffect(() => {
    const token = readToken();
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
      const token = readToken();
      if (token) load(token);
    }
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
  }, [load]);

  // Keeps the cache in step with what's on screen, including a ticked task
  // or deleted announcement, so coming back never shows it undone.
  useEffect(() => {
    const token = readToken();
    if (data && token) writeCachedDashboard(token, data);
  }, [data]);

  function handleTaskStatusChanged(id: number, status: TaskStatus) {
    const completed = status === 'completed';
    setData((d) => d && { ...d, tasks: d.tasks.map((t) => (t.id === id ? { ...t, status, completed } : t)) });
  }

  /* The event whose details are showing — kept after closing so the dialog
     still has it while it animates out. Its Edit opens the same editor the
     calendar uses, right here. */
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [eventComposer, setEventComposer] = useState<ComposerPrefill | null>(null);

  function handleOpenEvent(eventId: number) {
    const event = data?.events.find((e) => e.id === eventId);
    if (!event) return;
    setOpenEvent(toOfficialCalendarItem(event));
    setEventDetailOpen(true);
  }

  function handleAnnouncementDeleted(id: number) {
    setData((d) => d && { ...d, announcements: d.announcements.filter((a) => a.id !== id) });
  }

  // A failed refresh keeps whatever is already on screen; the error only
  // shows when there's nothing to show instead.
  const loading = data === null && !error;
  const loadError = data === null ? error : '';

  const events = data?.events ?? [];
  const tasks = data?.tasks ?? [];
  const announcements = data?.announcements ?? [];

  const stats = toDashboardStats(tasks, events, announcements);
  const upcomingEvents = toUpcomingEventRows(events, UPCOMING_EVENTS_LIMIT);
  const openTasks = toOpenTaskRows(tasks, OPEN_TASKS_LIMIT);
  const recentAnnouncements = toRecentAnnouncements(announcements);

  return (
    <div className="flex justify-center items-start gap-20">
      {/* LEFT COLUMN */}
      <div className="max-w-2xl flex-1">
        <WelcomeHeading />

        {/* UPPER BOX SECTION */}
        <StaggerReveal className="mt-6 flex flex-wrap justify-evenly gap-5" y={18}>
          {loading ? (
            <StatCardSkeleton colour="#F4EFD3" />
          ) : (
            <StatCard label={"OPEN TASKS"} value={stats.openTasks} colour={"#F4EFD3"} />
          )}
          {loading ? (
            <StatCardSkeleton colour="#B1C9DC" />
          ) : (
            <StatCard label={"UPCOMING EVENTS"} value={stats.upcomingEvents} colour={"#B1C9DC"} />
          )}
          {loading ? (
            <StatCardSkeleton colour="#ED6672" />
          ) : (
            <StatCard label={"NEW ANNOUNCEMENTS"} value={stats.newAnnouncements} colour={"#ED6672"} />
          )}
        </StaggerReveal>

        {/* ANNOUNCEMENTS SECTION */}
        <div className="mt-6">
          {loading ? (
            <div className="flex flex-col gap-4">
              <AnnouncementRowSkeleton />
              <AnnouncementRowSkeleton />
            </div>
          ) : loadError ? (
            <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center font-mono text-sm text-[#8B2E38]">
              {loadError}
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

          {loading ? (
            <div className="divide-y divide-gray-200 border-t border-gray-200">
              <EventRowSkeleton />
              <EventRowSkeleton />
              <EventRowSkeleton />
            </div>
          ) : loadError ? (
            <p className="border-t border-gray-200 px-4 py-6 text-center font-mono text-xs text-[#8B2E38]">
              {loadError}
            </p>
          ) : upcomingEvents.length === 0 ? (
            <p className="border-t border-gray-200 px-4 py-6 text-center font-mono text-xs text-gray-400">
              None upcoming.
            </p>
          ) : (
            <StaggerReveal
              className="max-h-[28rem] divide-y divide-gray-200 overflow-y-auto border-t border-gray-200"
              replayKey={upcomingEvents.length}
            >
              {groupEventsByDay(upcomingEvents).map((group) => (
                <EventRow
                  key={`${group.month}-${group.day}`}
                  month={group.month}
                  day={group.day}
                  events={group.events}
                  onOpen={handleOpenEvent}
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

          {loading ? (
            <div className="divide-y divide-gray-200 border-t border-gray-200">
              <TaskRowSkeleton />
              <TaskRowSkeleton />
              <TaskRowSkeleton />
            </div>
          ) : loadError ? (
            <p className="border-t border-gray-200 px-4 py-6 text-center font-mono text-xs text-[#8B2E38]">
              {loadError}
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
                  onStatusChanged={handleTaskStatusChanged}
                />
              ))}
            </StaggerReveal>
          )}
        </div>
      </div>

      {openEvent && (
        <EventDetailModal
          open={eventDetailOpen}
          item={openEvent}
          onClose={() => setEventDetailOpen(false)}
          onEdit={(item) => {
            setEventDetailOpen(false);
            setEventComposer({ mode: 'edit', item });
          }}
        />
      )}
      {eventComposer && (
        <EventComposer
          open={eventComposer !== null}
          prefill={eventComposer}
          canCreateSharedEvent={false}
          onClose={() => setEventComposer(null)}
        />
      )}
    </div>
  );
}
