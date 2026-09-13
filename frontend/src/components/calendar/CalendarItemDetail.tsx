import { itemColor, formatFullDate, formatTime, type CalendarItem } from '@/lib/calendar';

interface CalendarItemDetailProps {
  item: CalendarItem | null;
}

export default function CalendarItemDetail({ item }: CalendarItemDetailProps) {
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
          <div className="flex items-center gap-2">
            <ClockIcon />
            {formatTime(item.start)}
          </div>
        </div>

        {item.kind === 'event' && (
          <div className="mt-4 flex gap-2">
            <button className="flex-1 rounded-lg bg-[#ED6672] px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#d95a66]">
              RSVP
            </button>
            <button className="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-gray-600 transition-colors hover:bg-gray-50">
              Details
            </button>
          </div>
        )}
      </div>
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
