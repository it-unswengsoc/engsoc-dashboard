import type { DriveEntryRowData } from '@/types/documents';

interface DriveEntryRowProps {
  entry: DriveEntryRowData;
  onOpenFolder: () => void;
}

const EXTENSION_COLOURS: Record<string, { bg: string; text: string }> = {
  DOC: { bg: '#ED6672', text: '#ffffff' },
  PDF: { bg: '#8B2E38', text: '#ffffff' },
  XLS: { bg: '#3D6C94', text: '#ffffff' },
  PPT: { bg: '#F4EFD3', text: '#7A6A2E' },
  PNG: { bg: '#B1C9DC', text: '#2A4A63' },
  JPG: { bg: '#B1C9DC', text: '#2A4A63' },
  MP4: { bg: '#374151', text: '#ffffff' },
};
const DEFAULT_COLOUR = { bg: '#E5E7EB', text: '#374151' };
const FOLDER_COLOUR = { bg: '#F4EFD3', text: '#7A6A2E' };

function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

export default function DriveEntryRow({ entry, onOpenFolder }: DriveEntryRowProps) {
  const isFolder = entry.type === 'folder';
  const colour = isFolder ? FOLDER_COLOUR : (EXTENSION_COLOURS[entry.extensionLabel] ?? DEFAULT_COLOUR);

  const content = (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        style={{ backgroundColor: colour.bg, color: colour.text }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[9px] font-bold"
      >
        {isFolder ? <FolderGlyph /> : entry.extensionLabel}
      </div>

      <p className="flex-1 truncate text-sm font-bold text-gray-900">{entry.name}</p>

      <span className="w-20 shrink-0 rounded bg-gray-100 px-2 py-0.5 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {isFolder ? 'Folder' : entry.category}
      </span>
      <span className="w-28 shrink-0 text-right font-mono text-xs text-gray-400">{entry.modifiedLabel}</span>
      <span className="w-16 shrink-0 text-right font-mono text-xs text-gray-400">{entry.sizeLabel}</span>
    </div>
  );

  if (isFolder) {
    return (
      <button onClick={onOpenFolder} className="block w-full text-left transition-colors hover:bg-gray-50">
        {content}
      </button>
    );
  }

  if (entry.webViewLink) {
    return (
      <a href={entry.webViewLink} target="_blank" rel="noreferrer" className="block transition-colors hover:bg-gray-50">
        {content}
      </a>
    );
  }

  return <div className="transition-colors hover:bg-gray-50">{content}</div>;
}
