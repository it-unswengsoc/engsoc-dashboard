import type { DriveFolder, DriveFile } from '@/types/documents';
import { at, minutesAgo } from '@/mocks/data/date-helpers';

export const mockDriveFolders: DriveFolder[] = [
  { id: 'folder-it', name: 'IT', fileCount: 24, access: 'editable', colour: '#F1C4C9' },
  { id: 'folder-marketing', name: 'Marketing', fileCount: 24, access: 'view-only', colour: '#F4EFD3' },
  { id: 'folder-cabinet', name: 'Cabinet', fileCount: 24, access: 'restricted', colour: '#E5E7EB' },
  { id: 'folder-spons', name: 'Spons', fileCount: 24, access: 'view-only', colour: '#B1C9DC' },
];

export const mockDriveFiles: DriveFile[] = [
  {
    id: 'file-1',
    name: 'caitlyn important files.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    modifiedAt: minutesAgo(2),
    sizeBytes: 184_320,
    webViewLink: null,
  },
  {
    id: 'file-2',
    name: 'sponsorship deck.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    modifiedAt: minutesAgo(45),
    sizeBytes: 5_242_880,
    webViewLink: null,
  },
  {
    id: 'file-3',
    name: 'general meeting minutes',
    mimeType: 'application/vnd.google-apps.document',
    modifiedAt: at(-1, '14:00'),
    sizeBytes: null,
    webViewLink: null,
  },
  {
    id: 'file-4',
    name: 'careers night poster.png',
    mimeType: 'image/png',
    modifiedAt: at(-2, '09:30'),
    sizeBytes: 2_411_724,
    webViewLink: null,
  },
  {
    id: 'file-5',
    name: 'sponsor budget.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    modifiedAt: at(-4, '16:20'),
    sizeBytes: 98_304,
    webViewLink: null,
  },
  {
    id: 'file-6',
    name: 'event recap.mp4',
    mimeType: 'video/mp4',
    modifiedAt: at(-6, '11:00'),
    sizeBytes: 184_549_376,
    webViewLink: null,
  },
  {
    id: 'file-7',
    name: 'sponsorship interest form',
    mimeType: 'application/vnd.google-apps.form',
    modifiedAt: at(-8, '10:00'),
    sizeBytes: null,
    webViewLink: null,
  },
];
