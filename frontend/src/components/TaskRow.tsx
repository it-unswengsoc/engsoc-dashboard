'use client';

import { useState } from 'react';

interface TaskRowProps {
  daysTillDue: number;     // e.g. "5"
  name: string;      // e.g. "Edit cover photo"
  dateString: string; // e.g. "Mon, 1 June"
  time: string;      // e.g. "9:30PM"
}

/* This shat gonna style the days into a text string */
function getBadge(days: number): { label: string; styles: string } {
  if (days <= 0) {
    return { label: 'DUE', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  }
  if (days < 7) {
    return {
      label: `${days} ${days === 1 ? 'day' : 'days'}`,
      styles: 'bg-[#F4EFD3] text-gray-700',
    };
  }
  const weeks = Math.floor(days / 7);
  return {
    label: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`,
    styles: 'bg-[#B1C9DC] text-gray-700',
  };
}

export default function TaskRow({ daysTillDue, name, dateString, time }: TaskRowProps) {
  const badge = getBadge(daysTillDue);
  const [done, setDone] = useState(false);

  return (
    <div className="flex items-center gap-2.5 px-3 py-3.5">
      {/* Checkbox — red border on hover, red fill + tick once checked */}
      <label className="relative h-5 w-5 shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => setDone(e.target.checked)}
          className="h-full w-full cursor-pointer appearance-none rounded-md border border-gray-300 bg-white transition-colors hover:border-2 hover:border-[#ED6672] checked:border-0 checked:bg-[#ED6672]"
        />
        {done && (
          <svg
            className="pointer-events-none absolute inset-0 m-auto h-3 w-3 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </label>

      {/* Task details */}
      <div className="flex flex-col gap-0.5">
        <p
          className={`text-sm font-bold transition-colors ${
            done ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {name}
        </p>
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${badge.styles}`}>
            {badge.label}
          </span>
          <span className="font-mono text-xs text-gray-400">
            {dateString} {time}
          </span>
        </div>
      </div>
    </div>
  );
}
