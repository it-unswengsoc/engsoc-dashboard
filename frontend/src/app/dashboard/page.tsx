import EventRow from "@/components/EventRow";
import StatCard from "@/components/StatCard";
import TaskRow from "@/components/TaskRow";
import AnnouncementRow from "@/components/AnnouncementRow";
import {
  getUpcomingEvents,
  getOpenTasks,
  getRecentAnnouncements,
  getDashboardStats,
} from "@/services/dashboard";

/* Fetches live task/event data server-side; the deployment's own URL doesn't
   exist yet at build time, so this can't be statically prerendered. */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [stats, events, tasks, announcements] = await Promise.all([
    getDashboardStats(),
    getUpcomingEvents(),
    getOpenTasks(),
    getRecentAnnouncements(),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between">
        <h1 className="text-4xl font-bold text-gray-900">Welcome, Pussio.</h1>
        <div className="flex gap-2">
          <button className="rounded-lg bg-[#B1C9DC] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#9db8cd]">
            + New event
          </button>
          <button className="rounded-lg bg-[#B1C9DC] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#9db8cd]">
            + New request
          </button>
        </div>
      </div>

      {/* UPPER BOX SECTION */}
      <div className="mt-6 mr-78 flex flex-wrap justify-evenly gap-5">
        <StatCard label={"OPEN TASKS"} value={stats.openTasks} colour={"#F4EFD3"} />
        <StatCard label={"UPCOMING EVENTS"} value={stats.upcomingEvents} colour={"#B1C9DC"} />
        <StatCard label={"NEW ANNOUNCEMENTS"} value={stats.newAnnouncements} colour={"#ED6672"} />
      </div>

      {/* BELOW SECTION */}
      <div className="mt-6 flex gap-6">
          {/* ANNOUNCEMENTS SECTION */}
        <div className="flex-1">
          {/* ANNOUNCEMENTS HEADER */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
            <div className="flex gap-2">
              <button className="rounded-lg bg-[#B1C9DC] px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#9db8cd]">
                + New
              </button>
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-gray-600 transition-colors hover:bg-gray-50">
                Sort & Filter
              </button>
            </div>
          </div>

          {/* ANNOUNCEMENT ROWS */}
          <div className="mt-4 flex flex-col gap-4">
            {announcements.map((announcement) => (
              <AnnouncementRow key={announcement.id} {...announcement} />
            ))}
          </div>
        </div>

        {/* FAR RIGHT TWO SECTIONS */}
        <div className="flex w-72 flex-col gap-6">
          {/* EVENT ROW */}
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-2 bg-[#B1C9DC]" />
            <h2 className="px-4 py-3 text-base font-bold text-gray-900">
              Upcoming Events
            </h2>

            <div className="divide-y divide-gray-200 border-t border-gray-200">
              {events.map((event) => (
                <EventRow key={event.id} {...event} />
              ))}
            </div>

            <div className="border-t border-gray-200 p-3">
              <button className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50">
                Open calendar →
              </button>
            </div>
          </div>

          {/* TASKS */}
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-2 bg-[#B1C9DC]" />
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-base font-bold text-gray-900">My tasks</h2>
              <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#B1C9DC] text-lg font-bold text-white transition-colors hover:bg-[#9db8cd]">
                +
              </button>
            </div>

            <div className="divide-y divide-gray-200 border-t border-gray-200">
              {tasks.map((task) => (
                <TaskRow key={task.id} {...task} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}