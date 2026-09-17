import type { DriveFolder, DriveEntry } from '@/types/documents';
import { mockDriveFolders, mockDriveEntries } from '@/mocks/data/documents';

export async function getDriveFolders(): Promise<DriveFolder[]> {
  return mockDriveFolders;
}

export async function getDriveEntries(driveId: string, folderId?: string): Promise<DriveEntry[]> {
  const key = folderId ? `${driveId}/${folderId}` : driveId;
  return mockDriveEntries[key] ?? [];
}
