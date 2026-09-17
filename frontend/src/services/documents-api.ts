import type { DriveFolder, DriveEntry } from '@/types/documents';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { DriveFolder, DriveEntry };

/* The "Port Directories" — every Shared Drive in the EngSoc Drive. */
export async function getDriveFolders(): Promise<DriveFolder[]> {
  if (USE_MOCK) {
    const { getDriveFolders: mockGetDriveFolders } = await import('@/mocks/functions/documents');
    return mockGetDriveFolders();
  }

  const res = await fetch(apiUrl('/drive/folders'), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Drive folders');
  return data.data;
}

/* Lists a Shared Drive's immediate contents — its root if folderId is
   omitted, a specific folder within it otherwise. Called client-side as the
   member clicks into directories, so the page can behave like a real file
   browser instead of one static list. */
export async function getDriveEntries(driveId: string, folderId?: string): Promise<DriveEntry[]> {
  if (USE_MOCK) {
    const { getDriveEntries: mockGetDriveEntries } = await import('@/mocks/functions/documents');
    return mockGetDriveEntries(driveId, folderId);
  }

  const params = new URLSearchParams({ driveId });
  if (folderId) params.set('folderId', folderId);

  const res = await fetch(apiUrl(`/drive/entries?${params.toString()}`), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Drive contents');
  return data.data;
}
