import type { DriveFolder, DriveFile } from '@/types/documents';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { DriveFolder, DriveFile };

/* The "Port Directories" — top-level folders of the shared EngSoc Drive. */
export async function getDriveFolders(): Promise<DriveFolder[]> {
  if (USE_MOCK) {
    const { getDriveFolders: mockGetDriveFolders } = await import('@/mocks/functions/documents');
    return mockGetDriveFolders();
  }

  const res = await fetch(apiUrl('/drive/folders'));
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load Drive folders');
  return data.data;
}

export async function getRecentFiles(limit = 20): Promise<DriveFile[]> {
  if (USE_MOCK) {
    const { getRecentFiles: mockGetRecentFiles } = await import('@/mocks/functions/documents');
    return mockGetRecentFiles(limit);
  }

  const res = await fetch(apiUrl(`/drive/files/recent?limit=${limit}`));
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load recent files');
  return data.data;
}
