interface StatCardProps {
  label: string; // e.g. "OPEN TASKS"
  value: string; // e.g. "1/3" or "4"
  colour: string; // e.g "#ED6672"
}

export default function StatCard({ label, value, colour }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#8A94A3] flex flex-1 overflow-hidden">
      <div className="w-1.5 shrink-0" style={{ backgroundColor: colour }}></div>

      <div className="px-4 py-2.5">
        <p className="font-medium font-mono text-xs text-[#8A94A3]">{label}</p>
        <p className="font-bold text-2xl tracking-widest">{value}</p>
      </div>
    </div>
  );
}
