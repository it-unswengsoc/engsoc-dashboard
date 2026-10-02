import type { EventType } from '@/types/events';

export interface EventEntry {
  id: number;
  name: string;      // e.g. "General Meeting"
  type: EventType;   // controls the badge style
  time: string;       // e.g. "9:30PM"
  imageUrl: string | null;
}

interface EventRowProps {
  month: string;          // e.g. "JUN"
  day: number;            // e.g. 1
  events: EventEntry[];   // all events on this day, ordered by time
  onOpen: (eventId: number) => void;
}

function TypeBadge({ type }: { type: EventType }) {
  const styles = type === 'EXTERNAL' ? 'bg-[#F1C4C9] text-[#8B2E38]' : 'bg-gray-200 text-gray-700';
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${styles}`}>
      {type}
    </span>
  );
}

export default function EventRow({ month, day, events, onOpen }: EventRowProps) {
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

      {/* Event details — stacked when multiple events share this day. Each
          opens its details. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpen(event.id)}
            className="group -mx-1.5 -my-1 flex flex-col gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-gray-50"
          >
            {/* A short banner rather than the whole cover, so a photo
                barely adds height and the panel below stays in view. */}
            {event.imageUrl && (
              <span className="block aspect-[7/2] max-h-28 w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={event.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </span>
            )}
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-gray-900">{event.name}</span>
              <span className="flex items-center gap-1.5">
                <TypeBadge type={event.type} />
                <span className="font-mono text-xs text-gray-400">{event.time}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
