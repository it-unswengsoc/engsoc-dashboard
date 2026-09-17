import type { DriveFolderCardData } from '@/types/documents';

interface DriveFolderCardProps {
  folder: DriveFolderCardData;
  selected: boolean;
  onClick: () => void;
}

export default function DriveFolderCard({ folder, selected, onClick }: DriveFolderCardProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        selected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
      }`}
    >
      <div className="h-14 w-14 rounded-lg" style={{ backgroundColor: folder.colour }} />
      <p className="mt-3 text-lg font-bold text-gray-900">{folder.name}</p>
      <p className="font-mono text-xs text-gray-400">
        {folder.fileCount} files · {folder.accessLabel}
      </p>
    </button>
  );
}
