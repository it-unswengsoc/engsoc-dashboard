import {
  getDriveDepartments,
  getDriveEntries,
  searchDrive,
  createDriveFolder,
  createDriveFile,
  renameDriveEntry,
  getDriveAccessToken,
  uploadDriveFile,
} from '@/services/documents-api';
import type {
  DriveFolder,
  DriveDepartment,
  DriveEntry,
  DriveSearchResult,
  DriveCapabilities,
  DriveFileCategory,
  DriveFolderCardData,
  DriveDepartmentData,
  DriveEntryRowData,
  DriveSearchResultData,
  BrowserNode,
} from '@/types/documents';

export type {
  DriveFolderCardData,
  DriveDepartmentData,
  DriveEntryRowData,
  DriveSearchResultData,
  DriveFileCategory,
  DriveCapabilities,
  BrowserNode,
};

/* ---------- Folder / department mapper ---------- */

function deriveAccessLabel(capabilities: DriveCapabilities): string {
  return capabilities.canEdit ? 'Editable' : 'View only';
}

export function toDriveFolderCard(folder: DriveFolder): DriveFolderCardData {
  return {
    id: folder.id,
    name: folder.name,
    fileCount: folder.fileCount,
    accessLabel: deriveAccessLabel(folder.capabilities),
    colour: folder.colour,
    webViewLink: folder.webViewLink,
    capabilities: folder.capabilities,
  };
}

export function toDriveDepartment(department: DriveDepartment): DriveDepartmentData {
  return {
    name: department.name,
    colour: department.colour,
    drives: department.drives.map(toDriveFolderCard),
  };
}

/* ---------- Entry (folder or file row) mapper ---------- */

const EXTENSION_ALIASES: Record<string, string> = {
  DOCX: 'DOC', XLSX: 'XLS', PPTX: 'PPT', JPEG: 'JPG',
};

const GOOGLE_MIME_LABELS: Record<string, string> = {
  'application/vnd.google-apps.document': 'DOC',
  'application/vnd.google-apps.spreadsheet': 'XLS',
  'application/vnd.google-apps.presentation': 'PPT',
  'application/vnd.google-apps.form': 'FORM',
};

function extensionLabelFor(name: string, mimeType: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    const ext = match[1].toUpperCase();
    return EXTENSION_ALIASES[ext] ?? ext.slice(0, 4);
  }
  return GOOGLE_MIME_LABELS[mimeType] ?? 'FILE';
}

function categoryOf(mimeType: string): DriveFileCategory {
  if (mimeType === 'application/vnd.google-apps.form') return 'FORM';
  if (mimeType.startsWith('image/')) return 'PHOTO';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  return 'FILE';
}

function formatModified(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  const rounded = unitIndex === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

export function toDriveEntryRow(entry: DriveEntry): DriveEntryRowData {
  return {
    id: entry.id,
    name: entry.name,
    type: entry.type,
    category: entry.type === 'folder' ? 'FILE' : categoryOf(entry.mimeType),
    extensionLabel: entry.type === 'folder' ? '' : extensionLabelFor(entry.name, entry.mimeType),
    modifiedLabel: formatModified(entry.modifiedAt),
    sizeLabel: entry.type === 'folder' ? '—' : formatSize(entry.sizeBytes),
    webViewLink: entry.webViewLink,
    capabilities: entry.capabilities,
  };
}

export function toDriveSearchResult(result: DriveSearchResult): DriveSearchResultData {
  return {
    id: result.id,
    name: result.name,
    type: result.type,
    extensionLabel: result.type === 'folder' ? '' : extensionLabelFor(result.name, result.mimeType),
    driveName: result.driveName,
    modifiedLabel: formatModified(result.modifiedAt),
    webViewLink: result.webViewLink,
  };
}

/* ---------- Browser node mappers (Finder-style column browser) ---------- */

export function driveToBrowserNode(drive: DriveFolderCardData): BrowserNode {
  return {
    kind: 'drive',
    id: drive.id,
    driveId: drive.id,
    name: drive.name,
    navigable: true,
    accessLabel: drive.accessLabel,
    fileCount: drive.fileCount,
    webViewLink: drive.webViewLink,
    capabilities: drive.capabilities,
  };
}

export function entryToBrowserNode(driveId: string, entry: DriveEntryRowData): BrowserNode {
  return {
    kind: 'entry',
    id: entry.id,
    driveId,
    name: entry.name,
    navigable: entry.type === 'folder',
    type: entry.type,
    category: entry.category,
    extensionLabel: entry.extensionLabel,
    modifiedLabel: entry.modifiedLabel,
    sizeLabel: entry.sizeLabel,
    webViewLink: entry.webViewLink,
    accessLabel: deriveAccessLabel(entry.capabilities),
    capabilities: entry.capabilities,
  };
}

/* ---------- Page-shaped getters ---------- */

export interface DepartmentsResult {
  departments: DriveDepartmentData[];
  connected: boolean;
}

export interface DirectoryContentsResult {
  entries: DriveEntryRowData[];
  connected: boolean;
}

export async function getDepartments(token: string): Promise<DepartmentsResult> {
  const { departments, connected } = await getDriveDepartments(token);
  return { departments: departments.map(toDriveDepartment), connected };
}

export async function getDirectoryContents(
  token: string,
  driveId: string,
  folderId?: string
): Promise<DirectoryContentsResult> {
  const { entries, connected } = await getDriveEntries(token, driveId, folderId);
  return { entries: entries.map(toDriveEntryRow), connected };
}

export async function search(token: string, query: string): Promise<DriveSearchResultData[]> {
  const results = await searchDrive(token, query);
  return results.map(toDriveSearchResult);
}

export async function createFolder(
  token: string,
  driveId: string,
  parentId: string | undefined,
  name: string
): Promise<DriveEntryRowData> {
  const entry = await createDriveFolder(token, driveId, parentId, name);
  return toDriveEntryRow(entry);
}

/* Google Workspace editor mime types a member can create blank via "New" —
   Drive creates each of these empty and ready to open, no content needed. */
export const CREATABLE_FILE_TYPES = {
  doc: { label: 'Google Doc', mimeType: 'application/vnd.google-apps.document' },
  sheet: { label: 'Google Sheet', mimeType: 'application/vnd.google-apps.spreadsheet' },
  slides: { label: 'Google Slides', mimeType: 'application/vnd.google-apps.presentation' },
} as const;

export async function createFile(
  token: string,
  driveId: string,
  parentId: string | undefined,
  name: string,
  mimeType: string
): Promise<DriveEntryRowData> {
  const entry = await createDriveFile(token, driveId, parentId, name, mimeType);
  return toDriveEntryRow(entry);
}

export async function rename(token: string, fileId: string, name: string): Promise<DriveEntryRowData> {
  const entry = await renameDriveEntry(token, fileId, name);
  return toDriveEntryRow(entry);
}

export async function uploadFile(
  token: string,
  driveId: string,
  parentId: string | undefined,
  file: File
): Promise<DriveEntryRowData> {
  const { accessToken } = await getDriveAccessToken(token);
  const entry = await uploadDriveFile(accessToken, driveId, parentId, file);
  return toDriveEntryRow(entry);
}
