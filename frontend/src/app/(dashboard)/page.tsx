import EventRow from "@/components/EventRow";
import StatCard from "@/components/StatCard";
import TaskRow from "@/components/TaskRow";

export default function HomePage() {
  return (
    <div>
      {/* UPPER BOX SECTION */}
      <div className="flex flex-wrap justify-evenly gap-5">
        <StatCard label={"OPEN TASKS"} value={"5/9"} colour={"#F4EFD3"} />
        <StatCard label={"UPCOMING EVENTS"} value={"4"} colour={"#B1C9DC"} />
        <StatCard label={"NEW ANNOUNCEMENTS"} value={"6"} colour={"#ED6672"} />
      </div>

      {/* BELOW SECTION */}
      <div>
        <div>
          {/* This is where ANNOUCEMENTS should be */}
        </div>

        {/* FAR RIGHT TWO SECTIONS */}
        <div className="">
          {/* EVENT ROW */}
          <div className="w-max overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-2 bg-[#B1C9DC]" />
            <h2 className="px-6 py-5 text-2xl font-bold text-gray-900">
              Upcoming Events
            </h2>

            <div className="divide-y divide-gray-200 border-t border-gray-200">
              <EventRow month={"JUL"} day={5} name={"NAME"} type={"INTERNAL"} dateString={"05/08/26"} time={"9:30pm"}/>
              <EventRow month={"AUG"} day={5} name={"NAME"} type={"EXTERNAL"} dateString={"21/08/26"} time={"7:30pm"}/>
              <EventRow month={"AUG"} day={5} name={"NAME"} type={"EXTERNAL"} dateString={"21/08/26"} time={"7:30pm"}/>
            </div>

            <div className="border-t border-gray-200 p-4">
              <button className="w-full rounded-xl border border-gray-200 py-4 text-lg font-bold text-gray-700 transition-colors hover:bg-gray-50">
                Open calendar →
              </button>
            </div>
          </div>

          {/* TASKS */}
          <div className="w-max overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-2 bg-[#B1C9DC]" />
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-2xl font-bold text-gray-900">My tasks</h2>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#B1C9DC] text-2xl font-bold text-white transition-colors hover:bg-[#9db8cd]">
                +
              </button>
            </div>

            <div className="divide-y divide-gray-200 border-t border-gray-200">
              <TaskRow days_till_due={0} name={"finish wireframe"} dateString={"Mon, 1 June"} time={"9:30PM"} />
              <TaskRow days_till_due={4} name={"port meeting"} dateString={"Thu, 4 June"} time={"9:30PM"} />
              <TaskRow days_till_due={7} name={"team call"} dateString={"Mon, 8 June"} time={"9:30PM"} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}