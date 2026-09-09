import { getMonthGrid, itemsOnDay, itemColor, isSameDay, DAYS_SHORT, type CalendarItem } from '@/lib/calendar';

interface MonthViewProps {
  anchor: Date;
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
  onSelectDay: (day: Date) => void;
}

export default function MonthView({ anchor, items, onSelectItem, onSelectDay }: MonthViewProps) {
  const days = getMonthGrid(anchor);
  const today = new Date();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_SHORT.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = isSameDay(day, today);
          const dayItems = itemsOnDay(items, day);

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectDay(day)}
              className={`flex min-h-[6rem] cursor-pointer flex-col items-start gap-1 border-b border-r border-gray-100 p-1.5 text-left transition-colors hover:bg-gray-50 ${
                inMonth ? 'bg-white' : 'bg-gray-50/60'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isToday ? 'bg-[#ED6672] text-white' : inMonth ? 'text-gray-900' : 'text-gray-300'
                }`}
              >
                {day.getDate()}
              </span>

              <div className="flex w-full flex-col gap-0.5">
                {dayItems.slice(0, 3).map((item) => {
                  const { bg, text } = itemColor(item);
                  return (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      style={{ backgroundColor: bg, color: text }}
                      className="w-full truncate rounded px-1 py-0.5 text-left font-mono text-[9px] font-bold"
                    >
                      {item.name}
                    </button>
                  );
                })}
                {dayItems.length > 3 && (
                  <span className="font-mono text-[9px] text-gray-400">+{dayItems.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
