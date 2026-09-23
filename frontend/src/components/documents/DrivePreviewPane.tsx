import type { BrowserNode } from '@/types/documents';

interface DrivePreviewPaneProps {
  node: BrowserNode | null;
  path: string[]; // names of every selected node up to and including `node`
  locationLabel: string; // parent's name — the department for a drive, the previous column's node for an entry
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-900">{value}</span>
    </div>
  );
}

const OPEN_BUTTON_STYLES =
  'mt-4 block rounded-xl bg-[#3D6C94] px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition-all hover:bg-[#335a7d] hover:shadow-md active:scale-[0.98]';

/* A folder or drive has no "Open" button here — clicking it in its column
   already opened its contents as the next column, so a second explicit
   open action would be redundant. A file is the opposite: a single click
   only selects + previews it, so this is the discoverable alternative to
   double-clicking it to actually open it in Drive.

   This is a real <a target="_blank"> rather than a button calling
   window.open() on click — a JS-triggered window.open() from inside a
   framework's synthetic event handling is exactly the pattern browsers
   (and ad/privacy extensions) are most likely to silently block as a
   pop-up, with zero visible error. A genuine anchor-tag navigation isn't
   subject to that same heuristic. */
export default function DrivePreviewPane({ node, path, locationLabel }: DrivePreviewPaneProps) {
  if (!node) {
    return (
      <div className="flex w-80 shrink-0 flex-col items-center justify-center gap-2 border-l border-gray-100 px-6 text-center">
        <p className="font-mono text-xs text-gray-400">Select a file or folder to preview.</p>
      </div>
    );
  }

  const isFile = node.kind === 'entry' && node.type === 'file';

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-gray-100 px-6 py-6">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-xl"
        style={{ backgroundColor: isFile ? '#E5E7EB' : '#2A7D6F' }}
      >
        {isFile ? (
          <span className="font-mono text-[10px] font-bold text-gray-600">
            {node.kind === 'entry' ? node.extensionLabel : ''}
          </span>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
        )}
      </div>

      <h3 className="mt-3 text-lg font-bold text-gray-900">{node.name}</h3>
      <p className="truncate font-mono text-xs text-gray-400">{path.join(' / ')}</p>

      <div className="mt-4">
        {isFile ? (
          <>
            <DetailRow label="Modified" value={node.kind === 'entry' ? node.modifiedLabel : ''} />
            <DetailRow label="Size" value={node.kind === 'entry' ? node.sizeLabel : ''} />
            <DetailRow label="Type" value={node.kind === 'entry' ? node.extensionLabel || 'File' : ''} />
          </>
        ) : (
          <>
            <DetailRow label="Access" value={node.accessLabel} />
            <DetailRow label="Location" value={locationLabel} />
            <DetailRow label="Type" value={node.kind === 'drive' ? 'Shared Drive' : 'Folder'} />
          </>
        )}
      </div>

      {!isFile ? (
        <p className="mt-4 font-mono text-xs text-gray-400">Its contents are open in the next column.</p>
      ) : node.webViewLink ? (
        <a href={node.webViewLink} target="_blank" rel="noopener noreferrer" className={OPEN_BUTTON_STYLES}>
          Open file
        </a>
      ) : (
        <p className="mt-4 font-mono text-xs text-[#8B2E38]">
          Drive didn't provide a link to open this file.
        </p>
      )}
    </div>
  );
}
