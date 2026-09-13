import { getDriveFolders, getRecentFiles } from '@/services/documents-api';
import type {
  DriveFolder,
  DriveFile,
  DriveAccessLevel,
  DriveFileCategory,
  DriveFolderCardData,
  DriveFileRowData,
} from '@/types/documents';

export type { DriveFolderCardData, DriveFileRowData, DriveFileCategory };

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

/* ---------- File mapper ---------- */

const EXTENSION_ALIASES: Record<string, string> = {
  DOCX: 'DOC', XLSX: 'XLS', PPTX: 'PPT', JPEG: 'JPG',
};

const GOOGLE_MIME_LABELS: Record<string, string> = {
  'application/vnd.google-apps.document': 'DOC',
  'application/vnd.google-apps.spreadsheet': 'XLS',
  'application/vnd.google-apps.presentation': 'PPT',
  'application/vnd.google-apps.form': 'FORM',
};

function extensionLabel(file: DriveFile): string {
  const match = file.name.match(/\.([a-zA-Z0-9]+)$/);
  if (match) {
    const ext = match[1].toUpperCase();
    return EXTENSION_ALIASES[ext] ?? ext.slice(0, 4);
  }
  return GOOGLE_MIME_LABELS[file.mimeType] ?? 'FILE';
}

function categoryOf(file: DriveFile): DriveFileCategory {
  if (file.mimeType === 'application/vnd.google-apps.form') return 'FORM';
  if (file.mimeType.startsWith('image/')) return 'PHOTO';
  if (file.mimeType.startsWith('video/')) return 'VIDEO';
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

export function toDriveFileRow(file: DriveFile): DriveFileRowData {
  return {
    id: file.id,
    name: file.name,
    category: categoryOf(file),
    extensionLabel: extensionLabel(file),
    modifiedLabel: formatModified(file.modifiedAt),
    sizeLabel: formatSize(file.sizeBytes),
    webViewLink: file.webViewLink,
  };
}

/* ---------- Page-shaped getter ---------- */

export async function getDocumentsPageData(): Promise<{
  folders: DriveFolderCardData[];
  recentFiles: DriveFileRowData[];
}> {
  const [folders, files] = await Promise.all([getDriveFolders(), getRecentFiles()]);

  return {
    folders: folders.map(toDriveFolderCard),
    recentFiles: files
      .slice()
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      .map(toDriveFileRow),
  };
}
