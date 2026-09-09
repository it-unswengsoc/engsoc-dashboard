import { itemsOnDay, itemColor, isSameDay, formatHourLabel, formatTime, DAYS_SHORT, type CalendarItem } from '@/lib/calendar';

interface TimeGridViewProps {
  days: Date[]; // [anchor] for day view, 7 days for week view
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
}

const START_HOUR = 7;
const END_HOUR = 21;
const ROW_HEIGHT = 56; // px per hour
const DEFAULT_BLOCK_MINUTES = 60; // events/tasks carry no end time yet

export default function TimeGridView({ days, items, onSelectItem }: TimeGridViewProps) {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const today = new Date();
  const gridCols = `4rem repeat(${days.length}, 1fr)`;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 grid border-b border-gray-200 bg-white" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-l border-gray-100 px-2 py-2 text-center">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {DAYS_SHORT[day.getDay()]}
            </div>
            <div
              className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                isSameDay(day, today) ? 'bg-[#ED6672] text-white' : 'text-gray-900'
              }`}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: gridCols }}>
        <div>
          {hours.map((hour) => (
            <div
              key={hour}
              style={{ height: ROW_HEIGHT }}
              className="border-b border-gray-100 pr-2 text-right font-mono text-[10px] text-gray-400"
            >
              <span className="relative -top-2 inline-block">{formatHourLabel(hour)}</span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayItems = itemsOnDay(items, day).filter((item) => {
            const h = item.start.getHours();
            return h >= START_HOUR && h <= END_HOUR;
          });

          return (
            <div key={day.toISOString()} className="relative border-l border-gray-100">
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: ROW_HEIGHT }}
                  className={`border-b border-gray-100 ${isSameDay(day, today) ? 'bg-blue-50/40' : ''}`}
                />
              ))}

              {dayItems.map((item) => {
                const { bg, text } = itemColor(item);
                const minutesFromStart = (item.start.getHours() - START_HOUR) * 60 + item.start.getMinutes();
                const top = (minutesFromStart / 60) * ROW_HEIGHT;
                const height = (DEFAULT_BLOCK_MINUTES / 60) * ROW_HEIGHT - 4;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    style={{ top, height, backgroundColor: bg, color: text }}
                    className="absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-1 text-left font-mono text-[10px] font-bold shadow-sm transition-transform hover:scale-[1.02]"
                  >
                    <div className="truncate">{formatTime(item.start)}</div>
                    <div className="truncate">{item.name}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
