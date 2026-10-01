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
          opens its details; one with a photo shows it as a card. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {events.map((event) =>
          event.imageUrl ? (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpen(event.id)}
              className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-gray-100 text-left shadow-sm"
            >
              <img
                src={event.imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3">
                <p className="truncate text-sm font-bold text-white">{event.name}</p>
                <div className="flex items-center gap-1.5">
                  <TypeBadge type={event.type} />
                  <span className="font-mono text-xs text-white/80">{event.time}</span>
                </div>
              </div>
            </button>
          ) : (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpen(event.id)}
              className="-mx-1.5 -my-1 flex flex-col gap-0.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-gray-50"
            >
              <p className="text-sm font-bold text-gray-900">{event.name}</p>
              <div className="flex items-center gap-1.5">
                <TypeBadge type={event.type} />
                <span className="font-mono text-xs text-gray-400">{event.time}</span>
              </div>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
