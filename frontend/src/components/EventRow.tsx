import type { EventType } from '@/types/events';

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
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Calendar chip */}
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white">
        <span className="text-[8px] font-bold uppercase leading-none tracking-wide text-[#8B2E38]">
          {month}
        </span>
        <span className="text-base font-bold leading-tight text-gray-900">
          {day}
        </span>
      </div>

      {/* Event details */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-gray-900">{name}</p>
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${badgeStyles}`}>
            {type}
          </span>
          <span className="font-mono text-xs text-gray-400">
            {dateString} {time}
          </span>
        </div>
      </div>
    </div>
  );
}
