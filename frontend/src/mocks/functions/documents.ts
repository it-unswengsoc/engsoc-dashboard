import type { DriveDepartment, DriveEntry, DriveSearchResult } from '@/types/documents';
import { mockDepartments, mockDriveEntries } from '@/mocks/data/documents';

/* Copies, not the live mock arrays — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getDriveDepartments(): Promise<DriveDepartment[]> {
  return mockDepartments.slice();
}

export async function getDriveEntries(driveId: string, folderId?: string): Promise<DriveEntry[]> {
  const key = folderId ? `${driveId}/${folderId}` : driveId;
  return (mockDriveEntries[key] ?? []).slice();
}

const DRIVE_NAME_BY_ID: Record<string, string> = {
  'folder-it': 'IT',
  'folder-marketing': 'Marketing',
  'folder-cabinet': 'Cabinet',
  'folder-spons': 'Sponsorships',
};

export async function searchDrive(query: string): Promise<DriveSearchResult[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: DriveSearchResult[] = [];
  for (const [key, entries] of Object.entries(mockDriveEntries)) {
    const driveId = key.split('/')[0];
    for (const entry of entries) {
      if (entry.name.toLowerCase().includes(q)) {
        results.push({
          id: entry.id,
          name: entry.name,
          type: entry.type,
          mimeType: entry.mimeType,
          modifiedAt: entry.modifiedAt,
          webViewLink: entry.webViewLink,
          driveName: DRIVE_NAME_BY_ID[driveId] ?? 'EngSoc Drive',
        });
      }
    }
  }
  return results;
}

function mockId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/* These three mutate mockDriveEntries directly (module-level, in-memory) so
   the UI actually reflects a create/rename immediately in local dev,
   without a real backend to persist it — resets on every reload, same as
   any other in-memory mock. */

export async function createDriveFolder(
  driveId: string,
  parentId: string | undefined,
  name: string
): Promise<DriveEntry> {
  const entry: DriveEntry = {
    id: mockId('mock-folder'),
    name,
    type: 'folder',
    mimeType: 'application/vnd.google-apps.folder',
    modifiedAt: new Date().toISOString(),
    sizeBytes: null,
    webViewLink: null,
    capabilities: { canEdit: true, canAddChildren: true, canRename: true, canDelete: true },
  };
  const key = parentId ? `${driveId}/${parentId}` : driveId;
  mockDriveEntries[key] = [...(mockDriveEntries[key] ?? []), entry];
  return entry;
}

export async function createDriveFile(
  driveId: string,
  parentId: string | undefined,
  name: string,
  mimeType: string
): Promise<DriveEntry> {
  const entry: DriveEntry = {
    id: mockId('mock-file'),
    name,
    type: 'file',
    mimeType,
    modifiedAt: new Date().toISOString(),
    sizeBytes: 0,
    webViewLink: `https://docs.google.com/document/d/${mockId('mock')}/edit`,
    capabilities: { canEdit: true, canAddChildren: false, canRename: true, canDelete: true },
  };
  const key = parentId ? `${driveId}/${parentId}` : driveId;
  mockDriveEntries[key] = [...(mockDriveEntries[key] ?? []), entry];
  return entry;
}

export async function renameDriveEntry(fileId: string, name: string): Promise<DriveEntry> {
  for (const entries of Object.values(mockDriveEntries)) {
    const entry = entries.find((e) => e.id === fileId);
    if (entry) {
      entry.name = name;
      return entry;
    }
  }
  throw new Error('Not found in mock data');
}

export async function uploadDriveFile(
  driveId: string,
  parentId: string | undefined,
  file: File
): Promise<DriveEntry> {
  const entry: DriveEntry = {
    id: mockId('mock-upload'),
    name: file.name,
    type: 'file',
    mimeType: file.type || 'application/octet-stream',
    modifiedAt: new Date().toISOString(),
    sizeBytes: file.size,
    webViewLink: null,
    capabilities: { canEdit: true, canAddChildren: false, canRename: true, canDelete: true },
  };
  const key = parentId ? `${driveId}/${parentId}` : driveId;
  mockDriveEntries[key] = [...(mockDriveEntries[key] ?? []), entry];
  return entry;
}

/* Deletes are trash moves against a real backend (see functions/drive.ts's
   deleteDriveEntry) — this mock just drops the entry outright, and clears
   out any nested listing under it (a folder's own former contents) so a
   deleted folder doesn't leave orphaned children reachable by id. */
export async function deleteDriveEntry(fileId: string): Promise<void> {
  let found = false;
  for (const key of Object.keys(mockDriveEntries)) {
    const before = mockDriveEntries[key].length;
    mockDriveEntries[key] = mockDriveEntries[key].filter((e) => e.id !== fileId);
    if (mockDriveEntries[key].length !== before) found = true;
  }
  for (const key of Object.keys(mockDriveEntries)) {
    if (key.endsWith(`/${fileId}`)) delete mockDriveEntries[key];
  }
  if (!found) throw new Error('Not found in mock data');
}
