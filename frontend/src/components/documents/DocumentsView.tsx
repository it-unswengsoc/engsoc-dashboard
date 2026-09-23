'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DriveDepartmentData, DriveFileCategory, BrowserNode } from '@/types/documents';
import {
  getDepartments,
  getDirectoryContents,
  driveToBrowserNode,
  entryToBrowserNode,
  createFolder,
  createFile,
  rename,
  uploadFile,
  remove,
} from '@/services/documents';
import DepartmentSidebar from './DepartmentSidebar';
import DriveColumn from './DriveColumn';
import DrivePreviewPane from './DrivePreviewPane';
import NewDriveItemMenu from './NewDriveItemMenu';
import NamePromptDialog from './NamePromptDialog';
import ConfirmDeleteDialog from './ConfirmDeleteDialog';

const FILTERS: { label: string; category: DriveFileCategory | 'ALL' }[] = [
  { label: 'All', category: 'ALL' },
  { label: 'Files', category: 'FILE' },
  { label: 'Forms', category: 'FORM' },
  { label: 'Photos', category: 'PHOTO' },
  { label: 'Videos', category: 'VIDEO' },
];

/* Only the last MAX_VISIBLE_COLUMNS columns are ever mounted — full depth
   is still tracked in `selected`/`columns` (the breadcrumb reflects all of
   it, and clicking an earlier breadcrumb segment jumps straight back to
   it), but a folder tree nested arbitrarily deep would otherwise grow the
   DOM and the horizontally-scrolled strip without bound. */
const MAX_VISIBLE_COLUMNS = 4;

type CreateDialog =
  | { kind: 'folder' }
  | { kind: 'file'; mimeType: string; label: string }
  | { kind: 'rename' }
  | { kind: 'delete' }
  | null;

/* A Finder-style column browser: pick a department in the sidebar, then
   drill through its Shared Drives and folders one column at a time.
   Clicking a drive/folder both selects it (updates the preview pane) and
   immediately opens its contents as the next column. A file only selects +
   previews on a single click — opening one (in Drive, via webViewLink)
   takes a double-click, or the preview pane's "Open file" button.

   Search lives in the global header now, not here — it searches every
   Shared Drive the member can see, not just whatever's open in this
   column browser, so a page-local search box would've been misleading. */
export default function DocumentsView() {
  const router = useRouter();
  const [category, setCategory] = useState<DriveFileCategory | 'ALL'>('ALL');

  const [departments, setDepartments] = useState<DriveDepartmentData[]>([]);
  const [googleConnected, setGoogleConnected] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState('');
  const [activeDepartment, setActiveDepartment] = useState<DriveDepartmentData | null>(null);

  // columns[0] is always the active department's drives; columns[i] for
  // i > 0 is the contents of selected[i - 1]. Both track the *full* path,
  // even the part scrolled out of MAX_VISIBLE_COLUMNS.
  const [columns, setColumns] = useState<BrowserNode[][]>([]);
  const [selected, setSelected] = useState<BrowserNode[]>([]);
  const [pendingColumnAt, setPendingColumnAt] = useState<number | null>(null);
  const [openError, setOpenError] = useState('');

  const [dialog, setDialog] = useState<CreateDialog>(null);
  const [uploading, setUploading] = useState(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getDepartments(token)
      .then(({ departments, connected }) => {
        setDepartments(departments);
        setGoogleConnected(connected);
        if (departments.length > 0) {
          setActiveDepartment(departments[0]);
          setColumns([departments[0].drives.map(driveToBrowserNode)]);
        }
      })
      .catch((err) => {
        setDepartmentsError(err instanceof Error ? err.message : 'Failed to load Drive departments');
      })
      .finally(() => setDepartmentsLoading(false));
  }, [router]);

  function selectDepartment(department: DriveDepartmentData) {
    setActiveDepartment(department);
    setColumns([department.drives.map(driveToBrowserNode)]);
    setSelected([]);
    setOpenError('');
  }

  async function expandColumn(colIdx: number, node: BrowserNode) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const requestId = ++requestIdRef.current;
    setPendingColumnAt(colIdx + 1);
    setOpenError('');
    try {
      const folderId = node.kind === 'entry' ? node.id : undefined;
      const { entries, connected } = await getDirectoryContents(token, node.driveId, folderId);
      if (requestIdRef.current !== requestId) return; // superseded by a later click
      setGoogleConnected(connected);
      setColumns((prev) => [
        ...prev.slice(0, colIdx + 1),
        entries.map((entry) => entryToBrowserNode(node.driveId, entry)),
      ]);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setOpenError(err instanceof Error ? err.message : 'Failed to open this folder');
    } finally {
      if (requestIdRef.current === requestId) setPendingColumnAt(null);
    }
  }

  function selectNode(colIdx: number, node: BrowserNode) {
    // Re-clicking the already-open node at this column: leave its (already
    // fetched) next column alone instead of truncating and refetching it.
    if (selected[colIdx]?.id === node.id && columns[colIdx + 1] !== undefined) {
      setSelected((prev) => [...prev.slice(0, colIdx), node]);
      return;
    }

    setSelected((prev) => [...prev.slice(0, colIdx), node]);
    // A fresh selection at an earlier column invalidates whatever was
    // drilled into from the old one — drop any columns beyond it.
    setColumns((prev) => prev.slice(0, colIdx + 1));
    setOpenError('');

    if (node.navigable) {
      expandColumn(colIdx, node);
    }
  }

  // Only reached via double-click in a column (the preview pane's own
  // "Open file" is a real <a target="_blank"> now, not this) — a
  // window.open() from inside a framework event handler is exactly the
  // pattern browsers/extensions are most likely to silently swallow as a
  // pop-up, so this at least surfaces something instead of doing nothing.
  function openFile(node: BrowserNode) {
    if (node.webViewLink) {
      window.open(node.webViewLink, '_blank', 'noopener');
    } else {
      setOpenError(`Drive didn't provide a link to open "${node.name}".`);
    }
  }

  function jumpToPath(pathIndex: number) {
    setSelected((prev) => prev.slice(0, pathIndex));
    setColumns((prev) => prev.slice(0, pathIndex + 1));
    setOpenError('');
  }

  // "Where am I" for create/upload — the deepest currently selected node,
  // since selecting a drive/folder already opens its contents as the next
  // (now current) column. Nothing selected yet means only a department is
  // chosen, which isn't a real Drive location to create into.
  const currentLocation = selected[selected.length - 1] ?? null;
  const canAddHere = currentLocation?.capabilities.canAddChildren ?? false;
  const newDisabledReason = !currentLocation
    ? 'Select a drive to create or upload into it.'
    : !canAddHere
      ? "You don't have permission to add here."
      : '';

  async function refreshCurrentColumn() {
    if (!currentLocation) return;
    await expandColumn(selected.length - 1, currentLocation);
  }

  async function handleCreateFolder(name: string) {
    if (!currentLocation) return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const parentId = currentLocation.kind === 'entry' ? currentLocation.id : undefined;
    await createFolder(token, currentLocation.driveId, parentId, name);
    await refreshCurrentColumn();
  }

  async function handleCreateFile(name: string) {
    if (!currentLocation || dialog?.kind !== 'file') return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const parentId = currentLocation.kind === 'entry' ? currentLocation.id : undefined;
    const created = await createFile(token, currentLocation.driveId, parentId, name, dialog.mimeType);
    await refreshCurrentColumn();
    // A blank Doc/Sheet/Slides is only useful once you're actually in it —
    // open it straight away, same as Drive's own "New" menu does.
    if (created.webViewLink) window.open(created.webViewLink, '_blank', 'noopener');
  }

  async function handleRename(name: string) {
    if (!currentLocation || currentLocation.kind !== 'entry') return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const colIdx = selected.length - 1;
    const renamed = await rename(token, currentLocation.id, name);
    const updatedNode = entryToBrowserNode(currentLocation.driveId, renamed);

    setSelected((prev) => {
      const next = [...prev];
      next[colIdx] = updatedNode;
      return next;
    });
    setColumns((prev) => {
      const next = [...prev];
      if (next[colIdx]) {
        next[colIdx] = next[colIdx].map((n) => (n.id === updatedNode.id ? updatedNode : n));
      }
      return next;
    });
  }

  // Moves the currently-selected file/folder to Drive's trash. Drops it (and
  // any column that had been drilled into it) from `columns`, and pops
  // `selected` back one level so the preview pane falls back to its parent —
  // there's nothing left at this depth to preview.
  async function handleDelete() {
    if (!currentLocation || currentLocation.kind !== 'entry') return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const colIdx = selected.length - 1;
    const deletedId = currentLocation.id;
    await remove(token, deletedId);

    setColumns((prev) => {
      const next = prev.slice(0, colIdx + 1);
      next[colIdx] = next[colIdx].filter((n) => n.id !== deletedId);
      return next;
    });
    setSelected((prev) => prev.slice(0, colIdx));
  }

  async function handleUploadFiles(files: FileList) {
    if (!currentLocation) return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setUploading(true);
    setOpenError('');
    try {
      const parentId = currentLocation.kind === 'entry' ? currentLocation.id : undefined;
      for (const file of Array.from(files)) {
        await uploadFile(token, currentLocation.driveId, parentId, file);
      }
      await refreshCurrentColumn();
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Failed to upload one or more files');
    } finally {
      setUploading(false);
    }
  }

  const matchesFilter = useMemo(() => {
    return (node: BrowserNode) => {
      // A drive/folder always passes the type filter — filtering to
      // "Photos" shouldn't make the browsable structure itself disappear.
      if (category === 'ALL' || node.navigable) return true;
      return node.kind === 'entry' && node.category === category;
    };
  }, [category]);

  const previewNode = selected[selected.length - 1] ?? null;
  const previewPath = ['EngSoc Drive', ...selected.map((n) => n.name)];
  const previewLocation = selected.length <= 1 ? (activeDepartment?.name ?? '') : selected[selected.length - 2].name;

  const visibleStart = Math.max(0, columns.length - MAX_VISIBLE_COLUMNS);
  const visibleColumns = columns.slice(visibleStart);
  const showPendingColumn = pendingColumnAt !== null && pendingColumnAt >= columns.length;

  return (
    <div className="flex h-full flex-col">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <FolderIcon />
          <h1 className="text-3xl font-bold text-gray-900">EngSoc Drive</h1>
        </div>

        <NewDriveItemMenu
          disabled={!currentLocation || !canAddHere || uploading}
          disabledReason={uploading ? 'Uploading…' : newDisabledReason}
          onCreateFolder={() => setDialog({ kind: 'folder' })}
          onCreateFile={(mimeType, label) => setDialog({ kind: 'file', mimeType, label })}
          onUploadFiles={handleUploadFiles}
        />
      </div>

      {!googleConnected && (
        <p className="mt-4 rounded-xl border border-gray-200 bg-[#F4EFD3] px-4 py-2 font-mono text-xs font-bold text-[#7A6A2E]">
          Your Google Drive isn't connected — sign out and back in with Google to see your files here.
        </p>
      )}

      {/* BREADCRUMB + FILTER PILLS */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wide text-[#8A94A3]">
          {previewPath.map((name, i) => {
            const isCurrent = i === previewPath.length - 1;
            return (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300">/</span>}
                <button
                  onClick={() => jumpToPath(i)}
                  disabled={isCurrent}
                  className={isCurrent ? 'text-gray-900' : 'transition-colors hover:text-gray-600'}
                >
                  {name}
                </button>
              </span>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.category}
              onClick={() => setCategory(f.category)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                category === f.category
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* BROWSER */}
      <div className="mt-4 flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {departmentsLoading ? (
          <p className="p-6 font-mono text-xs text-gray-400">Loading…</p>
        ) : departmentsError ? (
          <p className="p-6 font-mono text-xs text-[#8B2E38]">{departmentsError}</p>
        ) : departments.length === 0 ? (
          <p className="p-6 font-mono text-xs text-gray-400">No shared drives found.</p>
        ) : (
          <>
            <div className="shrink-0 py-4 pl-4">
              <DepartmentSidebar
                departments={departments}
                activeDepartment={activeDepartment?.name ?? null}
                onSelect={selectDepartment}
              />
            </div>

            {/* No horizontal scrolling here on purpose — columns share
                whatever width is actually available (down to a readable
                minimum) instead of forcing the page wider. Capped at
                MAX_VISIBLE_COLUMNS, so this only ever has to fit that many. */}
            <div className="flex min-w-0 flex-1">
              {visibleColumns.map((nodes, i) => {
                const colIdx = visibleStart + i;
                return (
                  <DriveColumn
                    key={colIdx}
                    title={colIdx === 0 ? (activeDepartment?.name ?? '') : (selected[colIdx - 1]?.name ?? '')}
                    nodes={nodes.filter(matchesFilter)}
                    selectedId={selected[colIdx]?.id ?? null}
                    onSelect={(node) => selectNode(colIdx, node)}
                    onOpenFile={openFile}
                  />
                );
              })}
              {(showPendingColumn || uploading) && (
                <div className="flex h-full min-w-[140px] flex-1 basis-0 flex-col border-r border-gray-100">
                  <h3 className="border-b border-gray-100 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">
                    &nbsp;
                  </h3>
                  <p className="px-3 py-6 text-center font-mono text-xs text-gray-400">
                    {uploading ? 'Uploading…' : 'Loading…'}
                  </p>
                </div>
              )}
            </div>

            <DrivePreviewPane
              node={previewNode}
              path={previewPath}
              locationLabel={previewLocation}
              onRename={() => setDialog({ kind: 'rename' })}
              onDelete={() => setDialog({ kind: 'delete' })}
            />
          </>
        )}
      </div>

      {openError && <p className="mt-2 font-mono text-xs text-[#8B2E38]">{openError}</p>}

      <NamePromptDialog
        open={dialog?.kind === 'folder'}
        title="New folder"
        submitLabel="Create"
        onSubmit={handleCreateFolder}
        onClose={() => setDialog(null)}
      />
      <NamePromptDialog
        open={dialog?.kind === 'file'}
        title={dialog?.kind === 'file' ? `New ${dialog.label}` : ''}
        submitLabel="Create"
        onSubmit={handleCreateFile}
        onClose={() => setDialog(null)}
      />
      <NamePromptDialog
        open={dialog?.kind === 'rename'}
        title="Rename"
        submitLabel="Save"
        initialValue={previewNode?.name}
        onSubmit={handleRename}
        onClose={() => setDialog(null)}
      />
      <ConfirmDeleteDialog
        open={dialog?.kind === 'delete'}
        itemName={previewNode?.name ?? ''}
        onConfirm={handleDelete}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function FolderIcon() {
  return (
    <svg className="h-7 w-7 text-gray-900" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}
