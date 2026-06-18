import StatCard from "@/components/StatCard";

export default function HomePage() {
  return (
    <div>
      {/* UPPER BOX SECTION */}
      <div className="flex justify-evenly gap-5">
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
        <div>
          <div>
            {/* This is where UPCOMING EVENTS should be */}
          </div>

          <div>
            {/* This is where My TASKS should be */}
          </div>
        </div>
      </div>
    </div>
  );
}