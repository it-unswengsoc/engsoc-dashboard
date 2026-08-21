interface TaskRowProps {
  days_till_due: number;     // e.g. "5"
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

export default function TaskRow({ days_till_due, name, dateString, time }: TaskRowProps) {
  const badge = getBadge(days_till_due);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Checkbox */}
      <input
        type="checkbox"
        className="h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white transition-colors checked:border-gray-400 checked:bg-gray-100"
      />

      {/* Task details */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-gray-900">{name}</p>
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