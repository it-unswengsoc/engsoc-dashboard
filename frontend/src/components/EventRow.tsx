type EventType = 'INTERNAL' | 'EXTERNAL';

interface EventRowProps {
  month: string;     // e.g. "JUN"
  day: number;       // e.g. 1
  name: string;      // e.g. "General Meeting"
  type: EventType;   // controls the badge style
  dateString: string; // e.g. "Mon, 1 June"
  time: string;      // e.g. "9:30PM"
}

export default function EventRow({ month, day, name, type, dateString, time }: EventRowProps) {
  const badgeStyles =
    type === 'EXTERNAL'
      ? 'bg-[#F1C4C9] text-[#8B2E38]'
      : 'bg-gray-200 text-gray-700';

  return (
    <div className="flex items-center gap-4 px-6 py-5">
      {/* Calendar chip */}
      <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white">
        <span className="text-xs font-bold uppercase tracking-wide text-[#8B2E38]">
          {month}
        </span>
        <span className="text-2xl font-bold leading-none text-gray-900">
          {day}
        </span>
      </div>

      {/* Event details */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xl font-bold text-gray-900">{name}</p>
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wide ${badgeStyles}`}>
            {type}
          </span>
          <span className="font-mono text-sm text-gray-400">
            {dateString} {time}
          </span>
        </div>
      </div>
    </div>
  );
}
