interface StatCardProps {
  label: string; // e.g. "OPEN TASKS"
  value: string; // e.g. "1/3" or "4"
}

// TODO: Style this component to match the design
// - white card with rounded corners and a subtle border
// - small uppercase label in muted grey at the top
// - large bold number/value below the label
export default function StatCard({ label, value }: StatCardProps) {
  return (
    // bg-white = white background, rounded-lg = rounded corners, border = subtle outline, p-5 = space inside 5pixels
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* TODO: style the label — think small, uppercase, muted grey */}
      <p>{label}</p>
      {/* TODO: style the value — think large and bold */}
      <p>{value}</p>
    </div>
  );
}
