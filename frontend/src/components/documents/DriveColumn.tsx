import type { BrowserNode } from '@/types/documents';
import StaggerReveal from '@/components/StaggerReveal';

interface DriveColumnProps {
  title: string;
  nodes: BrowserNode[];
  selectedId: string | null;
  onSelect: (node: BrowserNode) => void;
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
const DEFAULT_FILE_COLOUR = { bg: '#E5E7EB', text: '#374151' };
const FOLDER_COLOUR = { bg: '#F4EFD3', text: '#7A6A2E' };

function NodeIcon({ node }: { node: BrowserNode }) {
  if (node.navigable) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
        style={{ backgroundColor: node.kind === 'drive' ? '#B1C9DC' : FOLDER_COLOUR.bg, color: node.kind === 'drive' ? '#2A4A63' : FOLDER_COLOUR.text }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </span>
    );
  }

  const colour = node.kind === 'entry' ? (EXTENSION_COLOURS[node.extensionLabel] ?? DEFAULT_FILE_COLOUR) : DEFAULT_FILE_COLOUR;
  return (
    <span
      style={{ backgroundColor: colour.bg, color: colour.text }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-[7px] font-bold"
    >
      {node.kind === 'entry' ? node.extensionLabel : ''}
    </span>
  );
}

/* One column in the Finder-style browser — a list of drives (the leftmost
   column) or of a folder's contents (every column after). Selecting a node
   drives which column appears to its right, via the parent's onSelect. */
export default function DriveColumn({ title, nodes, selectedId, onSelect }: DriveColumnProps) {
  return (
    <div className="flex h-full w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-100">
      <h3 className="sticky top-0 truncate border-b border-gray-100 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">
        {title}
      </h3>

      {nodes.length === 0 ? (
        <p className="px-3 py-6 text-center font-mono text-xs text-gray-400">Empty</p>
      ) : (
        <StaggerReveal className="flex flex-col py-1" replayKey={`${title}:${nodes.length}`} y={6} stagger={0.02}>
          {nodes.map((node) => {
            const isSelected = node.id === selectedId;
            return (
              <button
                key={node.id}
                onClick={() => onSelect(node)}
                className={`flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                  isSelected ? 'bg-[#B1C9DC]/25' : 'hover:bg-gray-50'
                }`}
              >
                <NodeIcon node={node} />
                <span className={`flex-1 truncate text-xs font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                  {node.name}
                </span>
                {node.navigable && (
                  <svg
                    className="h-3 w-3 shrink-0 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </StaggerReveal>
      )}
    </div>
  );
}
