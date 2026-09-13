interface StatCardProps {
  label: string; // e.g. "OPEN TASKS"
  value: string; // e.g. "1/3" or "4"
  colour: string; // e.g "#ED6672"
}

export default function StatCard({ label, value, colour }: StatCardProps) {
  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: colour }}></div>

      <div className="px-4 py-4">
        <p className="font-medium font-mono text-xs text-[#8A94A3] mb-2">{label}</p>
        <p className="font-bold text-3xl tracking-widest">{value}</p>
      </div>
    </div>
  );
}
