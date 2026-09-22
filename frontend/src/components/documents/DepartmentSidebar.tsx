import type { DriveDepartmentData } from '@/types/documents';

interface DepartmentSidebarProps {
  departments: DriveDepartmentData[];
  activeDepartment: string | null;
  onSelect: (department: DriveDepartmentData) => void;
}

export default function DepartmentSidebar({ departments, activeDepartment, onSelect }: DepartmentSidebarProps) {
  return (
    <div className="w-52 shrink-0 border-r border-gray-200 pr-4">
      <h2 className="px-2 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">Departments</h2>
      <nav className="mt-2 flex flex-col">
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
