'use client';

import { useState } from 'react';
import {
  itemsOnDay,
  itemColor,
  isSameDay,
  isBarItem,
  weekSpans,
  formatHourLabel,
  formatTime,
  DAYS_SHORT,
  type CalendarItem,
} from '@/lib/calendar';

interface TimeGridViewProps {
  days: Date[]; // [anchor] for day view, 7 days for week view
  items: CalendarItem[];
  onSelectItem: (item: CalendarItem) => void;
  onCreateRange: (start: Date, end: Date) => void;
}

const START_HOUR = 7;
const END_HOUR = 21;
const ROW_HEIGHT = 56; // px per hour
const DEFAULT_BLOCK_MINUTES = 60; // fallback height/duration when an item has no end time, or a plain click with no drag
const SNAP_MINUTES = 15;
const BAR_HEIGHT = 16; // px, all-day/multi-day strip
const BAR_GAP = 2;

interface DragState {
  day: Date;
  columnEl: HTMLElement;
  startMinutes: number; // minutes since midnight
  currentMinutes: number;
}

export default function TimeGridView({ days, items, onSelectItem, onCreateRange }: TimeGridViewProps) {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const today = new Date();
  const gridCols = `4rem repeat(${days.length}, 1fr)`;
  const [drag, setDrag] = useState<DragState | null>(null);

  // weekSpans works for any run of consecutive days, not just a calendar
  // week — reused as-is for the 1-or-7-day span this view is given.
  const barSpans = weekSpans(items, days);
  const barRows = barSpans.length ? Math.max(...barSpans.map((s) => s.row)) + 1 : 0;

  function minutesFromClientY(clientY: number, columnEl: HTMLElement): number {
    const rect = columnEl.getBoundingClientRect();
    const rawMinutes = ((clientY - rect.top) / ROW_HEIGHT) * 60 + START_HOUR * 60;
    const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    return Math.min(Math.max(snapped, START_HOUR * 60), (END_HOUR + 1) * 60);
  }

  function handleMouseDown(day: Date, e: React.MouseEvent<HTMLDivElement>) {
    const columnEl = e.currentTarget;
    const startMinutes = minutesFromClientY(e.clientY, columnEl);
    setDrag({ day, columnEl, startMinutes, currentMinutes: startMinutes });

    function handleMove(ev: MouseEvent) {
      setDrag((d) => (d ? { ...d, currentMinutes: minutesFromClientY(ev.clientY, columnEl) } : d));
    }
    function handleUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      const endMinutes = minutesFromClientY(ev.clientY, columnEl);
      const lo = Math.min(startMinutes, endMinutes);
      const hi = Math.max(startMinutes, endMinutes);
      // A plain click (no real drag) defaults to a 60-minute block, matching
      // Gmail/Outlook's "click an empty slot" convention.
      const finalEnd = hi > lo ? hi : lo + DEFAULT_BLOCK_MINUTES;

      const start = new Date(day);
      start.setHours(0, lo, 0, 0);
      const end = new Date(day);
      end.setHours(0, finalEnd, 0, 0);

      setDrag(null);
      onCreateRange(start, end);
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

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

      {barRows > 0 && (
        <div
          className="relative grid border-b border-gray-200 bg-white"
          style={{ gridTemplateColumns: gridCols, height: barRows * (BAR_HEIGHT + BAR_GAP) + BAR_GAP }}
        >
          <div className="flex items-center justify-end pr-2 font-mono text-[9px] text-gray-300">ALL DAY</div>
          <div className="relative col-span-full grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
            {barSpans.map((span) => {
              const { bg, text } = itemColor(span.item);
              return (
                <button
                  key={span.item.id}
                  onClick={() => onSelectItem(span.item)}
                  style={{
                    gridColumnStart: span.startCol + 1,
                    gridColumnEnd: span.startCol + 1 + span.span,
                    marginTop: span.row * (BAR_HEIGHT + BAR_GAP) + BAR_GAP,
                    height: BAR_HEIGHT,
                    backgroundColor: bg,
                    color: text,
                  }}
                  className="mx-0.5 truncate rounded px-1.5 text-left font-mono text-[10px] font-bold shadow-sm"
                >
                  {span.item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
            if (isBarItem(item)) return false;
            const h = item.start.getHours();
            return h >= START_HOUR && h <= END_HOUR;
          });

          const isDragCol = drag && isSameDay(drag.day, day);
          const dragTop = isDragCol
            ? ((Math.min(drag!.startMinutes, drag!.currentMinutes) - START_HOUR * 60) / 60) * ROW_HEIGHT
            : 0;
          const dragHeight = isDragCol
            ? Math.max(
                ((Math.max(drag!.startMinutes, drag!.currentMinutes) - Math.min(drag!.startMinutes, drag!.currentMinutes)) / 60) *
                  ROW_HEIGHT,
                4
              )
            : 0;

          return (
            <div
              key={day.toISOString()}
              className="relative select-none border-l border-gray-100"
              onMouseDown={(e) => handleMouseDown(day, e)}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  style={{ height: ROW_HEIGHT }}
                  className={`border-b border-gray-100 ${isSameDay(day, today) ? 'bg-blue-50/40' : ''}`}
                />
              ))}

              {isDragCol && (
                <div
                  style={{ top: dragTop, height: dragHeight }}
                  className="pointer-events-none absolute left-1 right-1 rounded-md bg-[#3D6C94]/25 ring-1 ring-[#3D6C94]"
                />
              )}

              {dayItems.map((item) => {
                const { bg, text } = itemColor(item);
                const minutesFromStart = (item.start.getHours() - START_HOUR) * 60 + item.start.getMinutes();
                const top = (minutesFromStart / 60) * ROW_HEIGHT;
                const durationMinutes =
                  item.kind === 'event' && item.end ? (item.end.getTime() - item.start.getTime()) / 60_000 : DEFAULT_BLOCK_MINUTES;
                const height = Math.max((Math.max(durationMinutes, 15) / 60) * ROW_HEIGHT - 4, 18);

                return (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
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
