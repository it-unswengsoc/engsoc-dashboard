import type { DriveFolder, DriveFile } from '@/types/documents';
import { mockDriveFolders, mockDriveFiles } from '@/mocks/data/documents';

export async function getDriveFolders(): Promise<DriveFolder[]> {
  return mockDriveFolders;
}

export async function getRecentFiles(limit = 20): Promise<DriveFile[]> {
  return mockDriveFiles
    .slice()
    .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
    .slice(0, limit);
}
