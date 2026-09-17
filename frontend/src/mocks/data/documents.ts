import type { DriveFolder, DriveEntry } from '@/types/documents';
import { at, minutesAgo } from '@/mocks/data/date-helpers';

export const mockDriveFolders: DriveFolder[] = [
  { id: 'folder-it', name: 'IT', fileCount: 24, access: 'editable', colour: '#F1C4C9' },
  { id: 'folder-marketing', name: 'Marketing', fileCount: 24, access: 'view-only', colour: '#F4EFD3' },
  { id: 'folder-cabinet', name: 'Cabinet', fileCount: 24, access: 'restricted', colour: '#E5E7EB' },
  { id: 'folder-spons', name: 'Spons', fileCount: 24, access: 'view-only', colour: '#B1C9DC' },
];

/* Keyed by "<driveId>" for a drive's root, or "<driveId>/<folderId>" for a
   folder within it — mirrors how the real backend scopes a listing to a
   parent. A couple of nested folders (IT > Archive, IT > Archive > 2025) are
   included so drive-into-folder navigation has something to actually click
   through in local/mock dev. */
export const mockDriveEntries: Record<string, DriveEntry[]> = {
  'folder-it': [
    {
      id: 'folder-it-archive',
      name: 'Archive',
      type: 'folder',
      mimeType: 'application/vnd.google-apps.folder',
      modifiedAt: at(-30, '09:00'),
      sizeBytes: null,
      webViewLink: null,
    },
    {
      id: 'file-1',
      name: 'caitlyn important files.docx',
      type: 'file',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      modifiedAt: minutesAgo(2),
      sizeBytes: 184_320,
      webViewLink: null,
    },
    {
      id: 'file-3',
      name: 'general meeting minutes',
      type: 'file',
      mimeType: 'application/vnd.google-apps.document',
      modifiedAt: at(-1, '14:00'),
      sizeBytes: null,
      webViewLink: null,
    },
  ],
  'folder-it/folder-it-archive': [
    {
      id: 'folder-it-archive-2025',
      name: '2025',
      type: 'folder',
      mimeType: 'application/vnd.google-apps.folder',
      modifiedAt: at(-200, '09:00'),
      sizeBytes: null,
      webViewLink: null,
    },
    {
      id: 'file-old-1',
      name: 'old onboarding doc',
      type: 'file',
      mimeType: 'application/vnd.google-apps.document',
      modifiedAt: at(-90, '10:00'),
      sizeBytes: null,
      webViewLink: null,
    },
  ],
  'folder-it/folder-it-archive-2025': [
    {
      id: 'file-old-2',
      name: '2025 handover notes',
      type: 'file',
      mimeType: 'application/vnd.google-apps.document',
      modifiedAt: at(-260, '10:00'),
      sizeBytes: null,
      webViewLink: null,
    },
  ],
  'folder-marketing': [
    {
      id: 'file-2',
      name: 'sponsorship deck.pptx',
      type: 'file',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      modifiedAt: minutesAgo(45),
      sizeBytes: 5_242_880,
      webViewLink: null,
    },
    {
      id: 'file-4',
      name: 'careers night poster.png',
      type: 'file',
      mimeType: 'image/png',
      modifiedAt: at(-2, '09:30'),
      sizeBytes: 2_411_724,
      webViewLink: null,
    },
    {
      id: 'file-6',
      name: 'event recap.mp4',
      type: 'file',
      mimeType: 'video/mp4',
      modifiedAt: at(-6, '11:00'),
      sizeBytes: 184_549_376,
      webViewLink: null,
    },
  ],
  'folder-cabinet': [
    {
      id: 'file-5',
      name: 'sponsor budget.xlsx',
      type: 'file',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      modifiedAt: at(-4, '16:20'),
      sizeBytes: 98_304,
      webViewLink: null,
    },
  ],
  'folder-spons': [
    {
      id: 'file-7',
      name: 'sponsorship interest form',
      type: 'file',
      mimeType: 'application/vnd.google-apps.form',
      modifiedAt: at(-8, '10:00'),
      sizeBytes: null,
      webViewLink: null,
    },
  ],
};
