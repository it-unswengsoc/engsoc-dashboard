interface StatCardProps {
  label: string; // e.g. "OPEN TASKS"
  value: string; // e.g. "1/3" or "4"
  colour: string; // e.g "#ED6672"
}

// TODO: Style this component to match the design
// - white card with rounded corners and a subtle border
// - small uppercase label in muted grey at the top
// - large bold number/value below the label
export default function StatCard({ label, value, colour }: StatCardProps) {
  return (
    // bg-white = white background, rounded-lg = rounded corners, border = subtle outline, p-5 = space inside 5pixels
    <div className="bg-white rounded-xl border border-[#8A94A3] w-[50%] flex overflow-hidden">
      <div className="w-2 shrink-0" style={{ backgroundColor: colour }}></div>

      <div className="p-5">
        <p className="font-medium font-mono text-base text-[#8A94A3]">{label}</p>
        <p className="font-bold text-3xl tracking-widest">{value}</p>
      </div>
    </div>
  );
}
