import type { DriveFolder, DriveEntry } from '@/types/documents';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { DriveFolder, DriveEntry };

export interface DriveFoldersResult {
  folders: DriveFolder[];
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
   Component can't reach that. The "Port Directories" are every Shared Drive
   their account can see. */
export async function getDriveFolders(token: string): Promise<DriveFoldersResult> {
  if (USE_MOCK) {
    const { getDriveFolders: mockGetDriveFolders } = await import('@/mocks/functions/documents');
    return { folders: await mockGetDriveFolders(), connected: true };
  }

  const res = await fetch(apiUrl('/drive/folders'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Drive folders');
  return { folders: data.data as DriveFolder[], connected: data.connected as boolean };
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
