'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DriveFolderCardData, DriveEntryRowData, DriveFileCategory } from '@/types/documents';
import { getDirectoryContents } from '@/services/documents';
import DriveFolderCard from './DriveFolderCard';
import DriveEntryRow from './DriveEntryRow';

interface DocumentsViewProps {
  folders: DriveFolderCardData[];
}

interface PathSegment {
  id: string; // the drive's own id for the root segment, a folder id otherwise
  name: string;
}

const FILTERS: { label: string; category: DriveFileCategory | 'ALL' }[] = [
  { label: 'All', category: 'ALL' },
  { label: 'Files', category: 'FILE' },
  { label: 'Forms', category: 'FORM' },
  { label: 'Photos', category: 'PHOTO' },
  { label: 'Videos', category: 'VIDEO' },
];

export default function DocumentsView({ folders }: DocumentsViewProps) {
  const [category, setCategory] = useState<DriveFileCategory | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(null);
  // path[0] is the drive root; path[i] for i > 0 is a folder navigated into.
  const [path, setPath] = useState<PathSegment[]>([]);
  const [entries, setEntries] = useState<DriveEntryRowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentFolderId = path.length > 1 ? path[path.length - 1].id : undefined;

  useEffect(() => {
    if (!selectedDriveId) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    getDirectoryContents(selectedDriveId, currentFolderId)
      .then((result) => {
        if (cancelled) return;
        setEntries(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load this directory');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDriveId, currentFolderId]);

  function selectDrive(folder: DriveFolderCardData) {
    setSelectedDriveId(folder.id);
    setPath([{ id: folder.id, name: folder.name }]);
  }

  function openFolder(entry: DriveEntryRowData) {
    setPath((prev) => [...prev, { id: entry.id, name: entry.name }]);
  }

  function jumpTo(index: number) {
    setPath((prev) => prev.slice(0, index + 1));
  }

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      // A folder always passes the type filter — filtering to "Photos"
      // shouldn't make the directory structure itself disappear.
      const matchesCategory = category === 'ALL' || entry.type === 'folder' || entry.category === category;
      const matchesQuery = q === '' || entry.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [entries, category, query]);

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <FolderIcon />
          <h1 className="text-3xl font-bold text-gray-900">EngSoc Drive</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* TODO: wire up to a real upload endpoint — Drive resumable upload not built yet */}
          <button className="flex items-center gap-2 rounded-xl bg-[#ED6672] px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-[#d95a66] hover:shadow-md active:scale-[0.98]">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </button>
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.category}
            onClick={() => setCategory(f.category)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              category === f.category
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* PORT DIRECTORIES */}
      <h2 className="mt-8 font-mono text-xs font-bold uppercase tracking-wide text-[#8A94A3]">Port Directories</h2>
      {folders.length === 0 ? (
        <p className="mt-3 font-mono text-xs text-gray-400">No shared drives found.</p>
      ) : (
        <div className="mt-3 grid grid-cols-4 gap-5">
          {folders.map((folder) => (
            <DriveFolderCard
              key={folder.id}
              folder={folder}
              selected={selectedDriveId === folder.id}
              onClick={() => selectDrive(folder)}
            />
          ))}
        </div>
      )}

      {/* DIRECTORY CONTENTS */}
      <div className="mt-8">
        <Breadcrumbs path={path} onJump={jumpTo} />
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <div className="w-9" />
          <span className="flex-1 font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">Name</span>
          <span className="w-20 shrink-0 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">Type</span>
          <span className="w-28 shrink-0 text-right font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">Modified</span>
          <span className="w-16 shrink-0 text-right font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">Size</span>
        </div>

        <div className="divide-y divide-gray-100">
          {!selectedDriveId ? (
            <p className="px-4 py-10 text-center font-mono text-xs text-gray-400">
              Select a directory above to browse its files.
            </p>
          ) : loading ? (
            <p className="px-4 py-10 text-center font-mono text-xs text-gray-400">Loading…</p>
          ) : error ? (
            <p className="px-4 py-10 text-center font-mono text-xs text-[#8B2E38]">{error}</p>
          ) : filteredEntries.length === 0 ? (
            <p className="px-4 py-10 text-center font-mono text-xs text-gray-400">This folder is empty.</p>
          ) : (
            filteredEntries.map((entry) => (
              <DriveEntryRow key={entry.id} entry={entry} onOpenFolder={() => openFolder(entry)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Breadcrumbs({ path, onJump }: { path: PathSegment[]; onJump: (index: number) => void }) {
  if (path.length === 0) {
    return <h2 className="font-mono text-xs font-bold uppercase tracking-wide text-[#8A94A3]">Directory</h2>;
  }

  return (
    <nav className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wide text-[#8A94A3]">
      {path.map((segment, i) => {
        const isCurrent = i === path.length - 1;
        return (
          <span key={segment.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300">/</span>}
            <button
              onClick={() => onJump(i)}
              disabled={isCurrent}
              className={isCurrent ? 'text-gray-900' : 'transition-colors hover:text-gray-600'}
            >
              {segment.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function FolderIcon() {
  return (
    <svg className="h-7 w-7 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}
