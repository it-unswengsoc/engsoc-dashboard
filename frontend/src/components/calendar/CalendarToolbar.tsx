export type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarToolbarProps {
  title: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const VIEWS: CalendarView[] = ['day', 'week', 'month', 'year'];

export default function CalendarToolbar({ title, view, onViewChange, onToday, onPrev, onNext }: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          aria-label="Previous"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="min-w-[10rem] text-lg font-bold text-gray-900">{title}</h2>

        <button
          onClick={onNext}
          aria-label="Next"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onToday}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-gray-600 transition-colors hover:bg-gray-50"
        >
          Today
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`rounded-md px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide transition-colors ${
              view === v ? 'bg-[#ED6672] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
