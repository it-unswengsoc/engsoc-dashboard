'use client';

import { useEffect, useState } from 'react';
import { Folder, FileText, ChevronRight } from 'lucide-react';
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
    getDriveDepartments(token)
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
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-2.5">
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-gray-200">
          {(['upload', 'browse'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setMode(opt)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${
                mode === opt ? 'bg-[#B1C9DC] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              {opt === 'upload' ? 'Upload new' : 'Choose from Drive'}
            </button>
          ))}
        </div>
        <select
          value={driveId}
          onChange={(e) => handleDriveChange(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-700"
        >
          {drives.map((d) => (
            <option key={d.id} value={d.id}>
              {d.department} / {d.name}
            </option>
          ))}
        </select>
      </div>

      {mode === 'upload' ? (
        <label className="cursor-pointer self-start rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-[#3D6C94] transition-colors hover:bg-gray-50">
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

          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50">
            {loadingEntries && <p className="p-2 font-mono text-xs text-gray-400">Loading…</p>}
            {!loadingEntries && entries.length === 0 && <p className="p-2 font-mono text-xs text-gray-400">Empty.</p>}
            {!loadingEntries &&
              entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleEntryClick(entry)}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs font-bold text-gray-700 transition-colors hover:bg-white"
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
