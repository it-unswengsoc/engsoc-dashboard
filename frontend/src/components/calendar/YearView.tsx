import { getMonthGrid, itemsOnDay, isSameDay, MONTHS_LONG, DAYS_MIN } from '@/lib/calendar';
import type { CalendarItem } from '@/lib/calendar';

interface YearViewProps {
  anchor: Date; // any date within the displayed year
  items: CalendarItem[];
  onSelectMonth: (monthDate: Date) => void;
}

export default function YearView({ anchor, items, onSelectMonth }: YearViewProps) {
  const year = anchor.getFullYear();
  const today = new Date();

  return (
    <div className="grid flex-1 grid-cols-3 gap-6 overflow-y-auto p-6">
      {MONTHS_LONG.map((label, monthIndex) => {
        const monthDate = new Date(year, monthIndex, 1);
        const days = getMonthGrid(monthDate);

        return (
          <button
            key={label}
            onClick={() => onSelectMonth(monthDate)}
            className="rounded-xl border border-gray-200 p-3 text-left transition-colors hover:border-[#B1C9DC] hover:bg-blue-50/30"
          >
            <div className="mb-2 text-sm font-bold text-gray-900">{label}</div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {DAYS_MIN.map((w, i) => (
                <span key={i} className="font-mono text-[8px] font-bold text-gray-300">
                  {w}
                </span>
              ))}
              {days.map((day) => {
                const inMonth = day.getMonth() === monthIndex;
                const hasItems = itemsOnDay(items, day).length > 0;
                const isToday = isSameDay(day, today);
                return (
                  <span
                    key={day.toISOString()}
                    className={`relative flex h-5 w-5 items-center justify-center justify-self-center rounded-full text-[9px] ${
                      isToday ? 'bg-[#ED6672] font-bold text-white' : inMonth ? 'text-gray-700' : 'text-gray-200'
                    }`}
                  >
                    {day.getDate()}
                    {hasItems && inMonth && !isToday && (
                      <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#B1C9DC]" />
                    )}
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
