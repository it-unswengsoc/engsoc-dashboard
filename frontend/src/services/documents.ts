import { getDriveFolders, getDriveEntries } from '@/services/documents-api';
import type {
  DriveFolder,
  DriveEntry,
  DriveAccessLevel,
  DriveFileCategory,
  DriveFolderCardData,
  DriveEntryRowData,
} from '@/types/documents';

export type { DriveFolderCardData, DriveEntryRowData, DriveFileCategory };

/* ---------- Folder mapper ---------- */

const ACCESS_LABELS: Record<DriveAccessLevel, string> = {
  editable: 'Editable',
  'view-only': 'View only',
  restricted: 'Restricted',
};

export function toDriveFolderCard(folder: DriveFolder): DriveFolderCardData {
  return {
    id: folder.id,
    name: folder.name,
    fileCount: folder.fileCount,
    accessLabel: ACCESS_LABELS[folder.access],
    colour: folder.colour,
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

function extensionLabel(entry: DriveEntry): string {
  const match = entry.name.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    const ext = match[1].toUpperCase();
    return EXTENSION_ALIASES[ext] ?? ext.slice(0, 4);
  }
  return GOOGLE_MIME_LABELS[entry.mimeType] ?? 'FILE';
}

function categoryOf(entry: DriveEntry): DriveFileCategory {
  if (entry.mimeType === 'application/vnd.google-apps.form') return 'FORM';
  if (entry.mimeType.startsWith('image/')) return 'PHOTO';
  if (entry.mimeType.startsWith('video/')) return 'VIDEO';
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
    category: entry.type === 'folder' ? 'FILE' : categoryOf(entry),
    extensionLabel: entry.type === 'folder' ? '' : extensionLabel(entry),
    modifiedLabel: formatModified(entry.modifiedAt),
    sizeLabel: entry.type === 'folder' ? '—' : formatSize(entry.sizeBytes),
    webViewLink: entry.webViewLink,
  };
}

/* ---------- Page-shaped getters ---------- */

export interface PortDirectoriesResult {
  folders: DriveFolderCardData[];
  connected: boolean;
}

export interface DirectoryContentsResult {
  entries: DriveEntryRowData[];
  connected: boolean;
}

export async function getPortDirectories(token: string): Promise<PortDirectoriesResult> {
  const { folders, connected } = await getDriveFolders(token);
  return { folders: folders.map(toDriveFolderCard), connected };
}

export async function getDirectoryContents(
  token: string,
  driveId: string,
  folderId?: string
): Promise<DirectoryContentsResult> {
  const { entries, connected } = await getDriveEntries(token, driveId, folderId);
  return { entries: entries.map(toDriveEntryRow), connected };
}
