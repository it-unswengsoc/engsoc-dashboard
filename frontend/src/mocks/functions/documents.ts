import type { DriveDepartment, DriveEntry } from '@/types/documents';
import { mockDepartments, mockDriveEntries } from '@/mocks/data/documents';

export async function getDriveDepartments(): Promise<DriveDepartment[]> {
  return mockDepartments;
}

export async function getDriveEntries(driveId: string, folderId?: string): Promise<DriveEntry[]> {
  const key = folderId ? `${driveId}/${folderId}` : driveId;
  return mockDriveEntries[key] ?? [];
}
