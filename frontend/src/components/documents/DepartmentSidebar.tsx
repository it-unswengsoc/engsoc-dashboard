import type { DriveDepartmentData } from '@/types/documents';

interface DepartmentSidebarProps {
  departments: DriveDepartmentData[];
  activeDepartment: string | null;
  onSelect: (department: DriveDepartmentData) => void;
}

/* Same size and spacing as DriveColumn's heading, so the two line up and
   share one rule across the top of the browser. */
function SidebarHeading() {
  return (
    <h2 className="sticky top-0 shrink-0 border-b border-gray-100 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">
      Departments
    </h2>
  );
}

export default function DepartmentSidebar({ departments, activeDepartment, onSelect }: DepartmentSidebarProps) {
  return (
    <div className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-200">
      <SidebarHeading />
      <nav className="flex flex-col p-2">
        {departments.map((department) => {
          const isActive = department.name === activeDepartment;
          return (
            <button
              key={department.name}
              onClick={() => onSelect(department)}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm font-bold transition-colors ${
                isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: department.colour }}
              />
              <span className="flex-1 truncate">{department.name}</span>
              <svg
                className={`h-3 w-3 shrink-0 ${isActive ? 'text-gray-400' : 'text-gray-300'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* Stands in for the sidebar while departments are loading. */
export function DepartmentSidebarSkeleton() {
  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-gray-200" aria-busy="true">
      <SidebarHeading />
      <div className="flex flex-col gap-1 p-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-gray-200" />
            <span className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
