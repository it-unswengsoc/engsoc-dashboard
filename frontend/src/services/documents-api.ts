import type { DriveDepartment, DriveEntry, DriveSearchResult } from '@/types/documents';
import { USE_MOCK } from '@/services/api-config';
import { api, apiFetch } from '@/services/api-client';

export type { DriveDepartment, DriveEntry, DriveSearchResult };

export interface DriveDepartmentsResult {
  departments: DriveDepartment[];
  // False if this account has no Google refresh token stored yet — a
  // password-only account, or a Google account that hasn't signed in since
  // this feature shipped. The documents page prompts a re-login in that case.
  connected: boolean;
}

export interface DriveEntriesResult {
  entries: DriveEntry[];
  connected: boolean;
}

/* Client-side only: Drive now reads as the signed-in member's own Google
   account (so a drive only shows up if they can actually see it in Google
   Drive themselves), which needs the JWT held in sessionStorage — a Server
   Component can't reach that. Every Shared Drive their account can see,
   grouped into departments by the backend. */
/* includeFileCounts: false skips a real per-Shared-Drive Google API cost
   (up to N extra round-trips, one per drive) — pass it whenever the caller
   only needs drive names (e.g. DriveFilePicker's destination dropdown),
   not the Documents page's own folder cards, the one place that actually
   displays a count. */
export async function getDriveDepartments(token: string, includeFileCounts = true): Promise<DriveDepartmentsResult> {
  if (USE_MOCK) {
    const { getDriveDepartments: mockGetDriveDepartments } = await import('@/mocks/functions/documents');
    return { departments: await mockGetDriveDepartments(), connected: true };
  }

  const data = await apiFetch(`/drive/folders${includeFileCounts ? '' : '?counts=0'}`, {
    token,
    errorMessage: 'Failed to load Drive folders',
  });
  return { departments: data.data as DriveDepartment[], connected: data.connected as boolean };
}

/* Lists a Shared Drive's immediate contents — its root if folderId is
   omitted, a specific folder within it otherwise — as visible to the
   signed-in member's own Google account. Called as the member clicks into
   directories, so the page can behave like a real file browser instead of
   one static list. */
export async function getDriveEntries(token: string, driveId: string, folderId?: string): Promise<DriveEntriesResult> {
  if (USE_MOCK) {
    const { getDriveEntries: mockGetDriveEntries } = await import('@/mocks/functions/documents');
    return { entries: await mockGetDriveEntries(driveId, folderId), connected: true };
  }

  const params = new URLSearchParams({ driveId });
  if (folderId) params.set('folderId', folderId);

  const data = await apiFetch(`/drive/entries?${params.toString()}`, {
    token,
    errorMessage: 'Failed to load Drive contents',
  });
  return { entries: data.data as DriveEntry[], connected: data.connected as boolean };
}

/* Full-text search across every Shared Drive (and My Drive) the member can
   see — backs the global header search, not scoped to the column browser's
   current location. */
export async function searchDrive(token: string, query: string): Promise<DriveSearchResult[]> {
  if (USE_MOCK) {
    const { searchDrive: mockSearchDrive } = await import('@/mocks/functions/documents');
    return mockSearchDrive(query);
  }

  return api<DriveSearchResult[]>(`/drive/search?q=${encodeURIComponent(query)}`, {
    token,
    errorMessage: 'Failed to search Drive',
  });
}

export async function createDriveFolder(
  token: string,
  driveId: string,
  parentId: string | undefined,
  name: string,
): Promise<DriveEntry> {
  if (USE_MOCK) {
    const { createDriveFolder: mockCreateDriveFolder } = await import('@/mocks/functions/documents');
    return mockCreateDriveFolder(driveId, parentId, name);
  }

  return api<DriveEntry>('/drive/folders/create', {
    method: 'POST',
    token,
    body: { driveId, parentId, name },
    errorMessage: 'Failed to create folder',
  });
}

export async function createDriveFile(
  token: string,
  driveId: string,
  parentId: string | undefined,
  name: string,
  mimeType: string,
): Promise<DriveEntry> {
  if (USE_MOCK) {
    const { createDriveFile: mockCreateDriveFile } = await import('@/mocks/functions/documents');
    return mockCreateDriveFile(driveId, parentId, name, mimeType);
  }

  return api<DriveEntry>('/drive/files/create', {
    method: 'POST',
    token,
    body: { driveId, parentId, name, mimeType },
    errorMessage: 'Failed to create file',
  });
}

export async function renameDriveEntry(token: string, fileId: string, name: string): Promise<DriveEntry> {
  if (USE_MOCK) {
    const { renameDriveEntry: mockRenameDriveEntry } = await import('@/mocks/functions/documents');
    return mockRenameDriveEntry(fileId, name);
  }

  return api<DriveEntry>(`/drive/entries/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    token,
    body: { name },
    errorMessage: 'Failed to rename',
  });
}

/* Moves a file or folder to Drive's own Trash (recoverable there), not a
   permanent delete — see backend/src/functions/drive.ts's deleteDriveEntry. */
export async function deleteDriveEntry(token: string, fileId: string): Promise<void> {
  if (USE_MOCK) {
    const { deleteDriveEntry: mockDeleteDriveEntry } = await import('@/mocks/functions/documents');
    return mockDeleteDriveEntry(fileId);
  }

  await apiFetch(`/drive/entries/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    token,
    errorMessage: 'Failed to delete',
  });
}

/* A short-lived Google access token for uploading a file's bytes straight
   to Google's own upload endpoint from the browser — see uploadDriveFile
   below for why this doesn't go through our own backend. */
export async function getDriveAccessToken(token: string): Promise<{ accessToken: string; expiresAt: number }> {
  if (USE_MOCK) {
    return { accessToken: 'mock-access-token', expiresAt: Date.now() + 60 * 60 * 1000 };
  }

  return api<{ accessToken: string; expiresAt: number }>('/drive/access-token', {
    token,
    errorMessage: 'Failed to get an upload token',
  });
}

/* Uploads directly to Google's own multipart upload endpoint using a
   short-lived access token (see getDriveAccessToken) rather than routing
   the file's bytes through our own backend — a serverless function's
   request body limit would otherwise cap uploads far below what Drive
   itself actually allows. */
export async function uploadDriveFile(
  accessToken: string,
  driveId: string,
  parentId: string | undefined,
  file: File,
): Promise<DriveEntry> {
  if (USE_MOCK) {
    const { uploadDriveFile: mockUploadDriveFile } = await import('@/mocks/functions/documents');
    return mockUploadDriveFile(driveId, parentId, file);
  }

  const metadata = { name: file.name, parents: [parentId || driveId] };
  const boundary = `engsoc-upload-${Math.random().toString(36).slice(2)}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    file,
    `\r\n--${boundary}--`,
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,modifiedTime,size,webViewLink,capabilities(canEdit,canAddChildren,canRename,canDelete)',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to upload file');

  return {
    id: data.id,
    name: data.name,
    type: data.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
    mimeType: data.mimeType,
    modifiedAt: data.modifiedTime,
    sizeBytes: data.size ? Number(data.size) : null,
    webViewLink: data.webViewLink ?? null,
    capabilities: {
      canEdit: data.capabilities?.canEdit ?? false,
      canAddChildren: data.capabilities?.canAddChildren ?? false,
      canRename: data.capabilities?.canRename ?? false,
      canDelete: data.capabilities?.canDelete ?? false,
    },
  };
}
