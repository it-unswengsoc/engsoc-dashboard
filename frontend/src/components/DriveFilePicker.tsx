'use client';

import { useEffect, useState } from 'react';
import { Folder, FileText, ChevronRight, Upload, FolderOpen } from 'lucide-react';
import { getDriveDepartments, getDriveEntries, getDriveAccessToken, uploadDriveFile } from '@/services/documents-api';
import type { DriveDepartment, DriveEntry } from '@/types/documents';

export interface PickedAttachment {
  driveFileId: string;
  name: string;
  webViewLink: string | null;
  mimeType: string | null;
}

export interface DriveFilePickerProps {
  onAttach: (attachment: PickedAttachment) => void;
}

/* Either pick a file already in Drive, or upload a new one from disk — both
   land on the same onAttach callback, so callers don't need to care which
   path produced the result. No folder creation/rename/delete here (that's
   the full Documents page's job); this is just enough browsing to find or
   drop a file, reusing the exact read/upload calls that page already has. */
export default function DriveFilePicker({ onAttach }: DriveFilePickerProps) {
  const [mode, setMode] = useState<'upload' | 'browse'>('upload');
  const [departments, setDepartments] = useState<DriveDepartment[]>([]);
  const [driveId, setDriveId] = useState('');
  const [path, setPath] = useState<{ id: string | undefined; name: string }[]>([]); // [] = drive root
  const [entries, setEntries] = useState<DriveEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const drives = departments.flatMap((d) => d.drives.map((drive) => ({ ...drive, department: d.name })));

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    // false: this picker only ever shows drive names in a dropdown, never a
    // file count — skips a real per-drive Google API cost the Documents
    // page's own folder cards still need.
    getDriveDepartments(token, false)
      .then(({ departments: depts }) => {
        setDepartments(depts);
        const firstDrive = depts.flatMap((d) => d.drives)[0];
        if (firstDrive) setDriveId(firstDrive.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== 'browse' || !driveId) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setLoadingEntries(true);
    setError('');
    const currentFolderId = path[path.length - 1]?.id;
    getDriveEntries(token, driveId, currentFolderId)
      .then(({ entries: e }) => setEntries(e))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load Drive contents'))
      .finally(() => setLoadingEntries(false));
  }, [mode, driveId, path]);

  function handleDriveChange(newDriveId: string) {
    setDriveId(newDriveId);
    setPath([]);
  }

  function handleEntryClick(entry: DriveEntry) {
    if (entry.type === 'folder') {
      setPath((prev) => [...prev, { id: entry.id, name: entry.name }]);
    } else {
      onAttach({ driveFileId: entry.id, name: entry.name, webViewLink: entry.webViewLink, mimeType: entry.mimeType });
    }
  }

  async function handleFilePicked(file: File | undefined) {
    if (!file || !driveId) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setUploading(true);
    setError('');
    try {
      const { accessToken } = await getDriveAccessToken(token);
      const uploaded = await uploadDriveFile(accessToken, driveId, path[path.length - 1]?.id, file);
      onAttach({ driveFileId: uploaded.id, name: uploaded.name, webViewLink: uploaded.webViewLink, mimeType: uploaded.mimeType });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  if (drives.length === 0) {
    return (
      <p className="font-mono text-xs text-gray-400">
        Connect Google Drive (sign out and back in with Google) to attach files.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border-[1.5px] border-dashed border-gray-300 bg-[#FAFBFC] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-gray-500">Attach a file</span>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {([
            { value: 'upload' as const, label: 'Upload file', icon: Upload },
            { value: 'browse' as const, label: 'Add from Drive', icon: FolderOpen },
          ]).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === value ? 'bg-white text-[#3D6C94] shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-semibold text-gray-500">{mode === 'upload' ? 'Save to' : 'Drive'}</span>
        <select
          value={driveId}
          onChange={(e) => handleDriveChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]"
        >
          {drives.map((d) => (
            <option key={d.id} value={d.id}>
              {d.department} / {d.name}
            </option>
          ))}
        </select>
      </label>

      {mode === 'upload' ? (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#3D6C94] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2A4A63]">
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Choose a file from your computer'}
          <input type="file" className="hidden" disabled={uploading} onChange={(e) => handleFilePicked(e.target.files?.[0])} />
        </label>
      ) : (
        <>
          <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
            <button onClick={() => setPath([])} className="hover:text-[#3D6C94]">
              {drives.find((d) => d.id === driveId)?.name}
            </button>
            {path.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <button onClick={() => setPath(path.slice(0, i + 1))} className="hover:text-[#3D6C94]">
                  {p.name}
                </button>
              </span>
            ))}
          </div>

          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
            {loadingEntries && <p className="p-2 font-mono text-xs text-gray-400">Loading…</p>}
            {!loadingEntries && entries.length === 0 && <p className="p-2 font-mono text-xs text-gray-400">Empty.</p>}
            {!loadingEntries &&
              entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleEntryClick(entry)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {entry.type === 'folder' ? (
                    <Folder className="h-3.5 w-3.5 shrink-0 text-[#B1C9DC]" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  )}
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-xs font-bold text-[#ED6672]">
          {error}
        </p>
      )}
    </div>
  );
}
