import EventRow from "@/components/EventRow";
import StatCard from "@/components/StatCard";
import TaskRow from "@/components/TaskRow";
import AnnouncementRow from "@/components/AnnouncementRow";
import WelcomeHeading from "@/components/WelcomeHeading";
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
    <div className="flex justify-center gap-20">
      {/* LEFT COLUMN */}
      <div className="max-w-2xl flex-1">
        <WelcomeHeading />

        {/* UPPER BOX SECTION */}
        <div className="mt-6 flex flex-wrap justify-evenly gap-5">
          <StatCard label={"OPEN TASKS"} value={stats.openTasks} colour={"#F4EFD3"} />
          <StatCard label={"UPCOMING EVENTS"} value={stats.upcomingEvents} colour={"#B1C9DC"} />
          <StatCard label={"NEW ANNOUNCEMENTS"} value={stats.newAnnouncements} colour={"#ED6672"} />
        </div>

        {/* ANNOUNCEMENTS SECTION */}
        <div className="mt-6">
          {/* ANNOUNCEMENT ROWS */}
          <div className="flex flex-col gap-4">
            {announcements.map((announcement) => (
              <AnnouncementRow key={announcement.id} {...announcement} />
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex w-72 shrink-0 flex-col gap-6">
        <button className="flex w-fit items-center justify-center gap-2 self-end rounded-xl bg-[#3D6C94] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#345d80] hover:shadow-md active:scale-[0.98]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>

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
  );
}
