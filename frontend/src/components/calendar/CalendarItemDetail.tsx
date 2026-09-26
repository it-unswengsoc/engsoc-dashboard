import { useState } from 'react';
import { itemColor, formatFullDate, formatTime, type CalendarItem } from '@/lib/calendar';
import { useCalendarContext } from './CalendarContext';
import EventDetailModal from './EventDetailModal';

type EventItem = Extract<CalendarItem, { kind: 'event' }>;

interface CalendarItemDetailProps {
  item: CalendarItem | null;
}

export default function CalendarItemDetail({ item }: CalendarItemDetailProps) {
  const { openComposer } = useCalendarContext();
  const [detailOpen, setDetailOpen] = useState(false);

  if (!item) {
    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <p className="font-mono text-xs text-gray-400">Select an event or task to see details.</p>
      </div>
    );
  }

  const { bg, text } = itemColor(item);
  const label = item.kind === 'event' ? `${item.type} EVENT` : 'TASK';

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="h-2" style={{ backgroundColor: bg }} />
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
        <span
          style={{ backgroundColor: bg, color: text }}
          className="mt-1.5 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide"
        >
          {label}
        </span>

        <div className="mt-4 flex flex-col gap-2 font-mono text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <CalendarIcon />
            {formatFullDate(item.start)}
          </div>
          {item.kind === 'event' && !item.allDay && (
            <div className="flex items-center gap-2">
              <ClockIcon />
              {formatTime(item.start)}
            </div>
          )}
          {item.kind === 'event' && item.location && (
            <div className="flex items-center gap-2">
              <LocationIcon />
              {item.location}
            </div>
          )}
        </div>

        {item.kind === 'event' && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setDetailOpen(true)}
              className="flex-1 rounded-lg bg-[#B1C9DC] px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#9db8cd]"
            >
              Details
            </button>
          </div>
        )}
      </div>

      {item.kind === 'event' && (
        <EventDetailModal
          open={detailOpen}
          item={item}
          onClose={() => setDetailOpen(false)}
          onEdit={(eventItem: EventItem) => {
            setDetailOpen(false);
            openComposer({ mode: 'edit', item: eventItem });
          }}
        />
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
