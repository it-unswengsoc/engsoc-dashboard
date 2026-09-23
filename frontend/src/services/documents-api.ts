import type { DriveDepartment, DriveEntry, DriveSearchResult } from '@/types/documents';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

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
export async function getDriveDepartments(token: string): Promise<DriveDepartmentsResult> {
  if (USE_MOCK) {
    const { getDriveDepartments: mockGetDriveDepartments } = await import('@/mocks/functions/documents');
    return { departments: await mockGetDriveDepartments(), connected: true };
  }

  const res = await fetch(apiUrl('/drive/folders'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Drive folders');
  return { departments: data.data as DriveDepartment[], connected: data.connected as boolean };
}

/* Lists a Shared Drive's immediate contents — its root if folderId is
   omitted, a specific folder within it otherwise — as visible to the
   signed-in member's own Google account. Called as the member clicks into
   directories, so the page can behave like a real file browser instead of
   one static list. */
export async function getDriveEntries(
  token: string,
  driveId: string,
  folderId?: string
): Promise<DriveEntriesResult> {
  if (USE_MOCK) {
    const { getDriveEntries: mockGetDriveEntries } = await import('@/mocks/functions/documents');
    return { entries: await mockGetDriveEntries(driveId, folderId), connected: true };
  }

  const params = new URLSearchParams({ driveId });
  if (folderId) params.set('folderId', folderId);

  const res = await fetch(apiUrl(`/drive/entries?${params.toString()}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Drive contents');
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

  const res = await fetch(apiUrl(`/drive/search?q=${encodeURIComponent(query)}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to search Drive');
  return data.data as DriveSearchResult[];
}

export async function createDriveFolder(
  token: string,
  driveId: string,
  parentId: string | undefined,
  name: string
): Promise<DriveEntry> {
  if (USE_MOCK) {
    const { createDriveFolder: mockCreateDriveFolder } = await import('@/mocks/functions/documents');
    return mockCreateDriveFolder(driveId, parentId, name);
  }

  const res = await fetch(apiUrl('/drive/folders/create'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ driveId, parentId, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create folder');
  return data.data as DriveEntry;
}

export async function createDriveFile(
  token: string,
  driveId: string,
  parentId: string | undefined,
  name: string,
  mimeType: string
): Promise<DriveEntry> {
  if (USE_MOCK) {
    const { createDriveFile: mockCreateDriveFile } = await import('@/mocks/functions/documents');
    return mockCreateDriveFile(driveId, parentId, name, mimeType);
  }

  const res = await fetch(apiUrl('/drive/files/create'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ driveId, parentId, name, mimeType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create file');
  return data.data as DriveEntry;
}

export async function renameDriveEntry(token: string, fileId: string, name: string): Promise<DriveEntry> {
  if (USE_MOCK) {
    const { renameDriveEntry: mockRenameDriveEntry } = await import('@/mocks/functions/documents');
    return mockRenameDriveEntry(fileId, name);
  }

  const res = await fetch(apiUrl(`/drive/entries/${encodeURIComponent(fileId)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to rename');
  return data.data as DriveEntry;
}

/* A short-lived Google access token for uploading a file's bytes straight
   to Google's own upload endpoint from the browser — see uploadDriveFile
   below for why this doesn't go through our own backend. */
export async function getDriveAccessToken(token: string): Promise<{ accessToken: string; expiresAt: number }> {
  if (USE_MOCK) {
    return { accessToken: 'mock-access-token', expiresAt: Date.now() + 60 * 60 * 1000 };
  }

  const res = await fetch(apiUrl('/drive/access-token'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to get an upload token');
  return data.data as { accessToken: string; expiresAt: number };
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
  file: File
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
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,modifiedTime,size,webViewLink,capabilities(canEdit,canAddChildren,canRename)',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
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
    },
  };
}
