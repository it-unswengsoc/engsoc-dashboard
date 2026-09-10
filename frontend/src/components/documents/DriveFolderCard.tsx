import type { DriveFolderCardData } from '@/types/documents';

interface DriveFolderCardProps {
  folder: DriveFolderCardData;
}

export default function DriveFolderCard({ folder }: DriveFolderCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-14 w-14 rounded-lg" style={{ backgroundColor: folder.colour }} />
      <p className="mt-3 text-lg font-bold text-gray-900">{folder.name}</p>
      <p className="font-mono text-xs text-gray-400">
        {folder.fileCount} files · {folder.accessLabel}
      </p>
    </div>
  );
}
