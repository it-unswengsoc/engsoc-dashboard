import type { EventType } from '@/types/events';

export interface EventEntry {
  id: number;
  name: string;      // e.g. "General Meeting"
  type: EventType;   // controls the badge style
  time: string;       // e.g. "9:30PM"
}

interface EventRowProps {
  month: string;          // e.g. "JUN"
  day: number;            // e.g. 1
  events: EventEntry[];   // all events on this day, ordered by time
}

export default function EventRow({ month, day, events }: EventRowProps) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-3.5">
      {/* Calendar chip */}
      <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white">
        <span className="text-[7px] font-bold uppercase leading-none tracking-wide text-[#8B2E38]">
          {month}
        </span>
        <span className="text-sm font-bold leading-tight text-gray-900">
          {day}
        </span>
      </div>

      {/* Event details — stacked when multiple events share this day */}
      <div className="flex flex-col gap-2.5">
        {events.map((event) => {
          const badgeStyles =
            event.type === 'EXTERNAL'
              ? 'bg-[#F1C4C9] text-[#8B2E38]'
              : 'bg-gray-200 text-gray-700';

          return (
            <div key={event.id} className="flex flex-col gap-0.5">
              <p className="text-sm font-bold text-gray-900">{event.name}</p>
              <div className="flex items-center gap-1.5">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${badgeStyles}`}>
                  {event.type}
                </span>
                <span className="font-mono text-xs text-gray-400">
                  {event.time}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
