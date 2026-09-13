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
import type { EventRowData } from "@/types/dashboard";

/* Fetches live task/event data server-side; the deployment's own URL doesn't
   exist yet at build time, so this can't be statically prerendered. */
export const dynamic = "force-dynamic";

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

export default async function HomePage() {
  const [stats, events, tasks, announcements] = await Promise.all([
    getDashboardStats(),
    getUpcomingEvents(20),
    getOpenTasks(20),
    getRecentAnnouncements(),
  ]);

  return (
    <div className="flex justify-center items-start gap-20">
      {/* LEFT COLUMN */}
      <div className="max-w-2xl flex-1">
        <WelcomeHeading />

        {/* UPPER BOX SECTION */}
        <div className="mt-6 flex flex-wrap justify-evenly gap-5">
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
      <div className="sticky top-0 -mt-8 flex w-80 shrink-0 flex-col gap-6">
        {/* EVENT ROW */}
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-2 bg-[#B1C9DC]" />
          <h2 className="bg-gray-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-500">
            Upcoming Events
          </h2>

          <div className="max-h-72 divide-y divide-gray-200 overflow-y-auto border-t border-gray-200">
            {groupEventsByDay(events).map((group) => (
              <EventRow
                key={`${group.month}-${group.day}`}
                month={group.month}
                day={group.day}
                events={group.events}
              />
            ))}
          </div>
        </div>

        {/* TASKS */}
        <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-2 bg-[#B1C9DC]" />
          <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
              My tasks
            </h2>
          </div>

          <div className="max-h-56 divide-y divide-gray-200 overflow-y-auto border-t border-gray-200">
            {tasks.map((task) => (
              <TaskRow key={task.id} {...task} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
