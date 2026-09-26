'use client';

import { useState } from 'react';
import { getMonthGrid, itemsOnDay, weekSpans, itemColor, isSameDay, isBarItem, DAYS_SHORT, type CalendarItem } from '@/lib/calendar';
import StaggerReveal from '@/components/StaggerReveal';

interface MonthViewProps {
  anchor: Date;
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
  onSelectDay: (day: Date) => void;
  onCreateRange: (start: Date, end: Date) => void;
}

const BAR_HEIGHT = 16; // px
const BAR_GAP = 2;

export default function MonthView({ anchor, items, onSelectItem, onSelectDay, onCreateRange }: MonthViewProps) {
  const days = getMonthGrid(anchor);
  const today = new Date();
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const [dragging, setDragging] = useState(false);

  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const spansByWeek = weeks.map((week) => weekSpans(items, week));
  const barRowsByWeek = spansByWeek.map((spans) => (spans.length ? Math.max(...spans.map((s) => s.row)) + 1 : 0));

  function finishDrag() {
    if (dragStart && dragEnd && !isSameDay(dragStart, dragEnd)) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      onCreateRange(start, end);
    }
    setDragStart(null);
    setDragEnd(null);
    setDragging(false);
  }

  return (
    <div
      className="flex flex-1 flex-col overflow-y-auto"
      onMouseUp={finishDrag}
      onMouseLeave={() => dragging && finishDrag()}
    >
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

      <div className="relative flex-1">
        <StaggerReveal
          className="grid flex-1 grid-cols-7 grid-rows-6"
          replayKey={`${anchor.getFullYear()}-${anchor.getMonth()}`}
          y={8}
          stagger={0.012}
        >
          {days.map((day, index) => {
            const inMonth = day.getMonth() === anchor.getMonth();
            const isToday = isSameDay(day, today);
            const dayItems = itemsOnDay(items, day).filter((item) => !isBarItem(item));
            const weekIdx = Math.floor(index / 7);
            const barSpace = barRowsByWeek[weekIdx] * (BAR_HEIGHT + BAR_GAP);
            const isDragging = dragStart && dragEnd && day >= (dragStart < dragEnd ? dragStart : dragEnd) && day <= (dragStart < dragEnd ? dragEnd : dragStart);

            return (
              <div
                key={day.toISOString()}
                role="button"
                tabIndex={0}
                onClick={() => !dragging && onSelectDay(day)}
                onKeyDown={(e) => e.key === 'Enter' && onSelectDay(day)}
                onMouseDown={() => {
                  setDragStart(day);
                  setDragEnd(day);
                  setDragging(true);
                }}
                onMouseEnter={() => dragging && setDragEnd(day)}
                className={`flex min-h-[6rem] cursor-pointer select-none flex-col items-start gap-1 border-b border-r border-gray-100 p-1.5 text-left transition-colors hover:bg-gray-50 ${
                  inMonth ? 'bg-white' : 'bg-gray-50/60'
                } ${isDragging ? 'bg-[#B1C9DC]/20' : ''}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? 'bg-[#ED6672] text-white' : inMonth ? 'text-gray-900' : 'text-gray-300'
                  }`}
                >
                  {day.getDate()}
                </span>

                {barSpace > 0 && <div style={{ height: barSpace }} />}

                <div className="flex w-full flex-col gap-0.5">
                  {dayItems
                    .slice(0, 3)
                    .map((item) => {
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
        </StaggerReveal>

        {/* Multi-day/all-day bars — a separate overlay sharing the exact same
            grid template as the day cells above, so a bar's column/row always
            lines up with the cells it spans regardless of their rendered
            pixel size. */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-7 grid-rows-6">
          {spansByWeek.flatMap((spans, weekIdx) =>
            spans.map((span) => {
              const { bg, text } = itemColor(span.item);
              return (
                <button
                  key={`${weekIdx}-${span.item.id}`}
                  onClick={() => onSelectItem(span.item)}
                  style={{
                    gridRow: weekIdx + 1,
                    gridColumnStart: span.startCol + 1,
                    gridColumnEnd: span.startCol + 1 + span.span,
                    marginTop: 26 + span.row * (BAR_HEIGHT + BAR_GAP),
                    height: BAR_HEIGHT,
                    backgroundColor: bg,
                    color: text,
                  }}
                  className="pointer-events-auto mx-0.5 self-start truncate rounded px-1 text-left font-mono text-[9px] font-bold shadow-sm"
                >
                  {span.item.name}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
