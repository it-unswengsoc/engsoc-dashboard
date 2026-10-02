interface StatCardProps {
  label: string; // e.g. "OPEN TASKS"
  value: string; // e.g. "1/3" or "4"
  colour: string; // e.g "#ED6672"
}

export default function StatCard({ label, value, colour }: StatCardProps) {
  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: colour }}></div>

      <div className="min-w-0 px-3 py-3 sm:px-4 sm:py-4">
        <p className="font-medium font-mono text-[10px] leading-tight text-[#8A94A3] mb-1.5 sm:mb-2 sm:text-xs">{label}</p>
        <p className="font-bold text-2xl tracking-widest sm:text-3xl">{value}</p>
      </div>
    </div>
  );
}
