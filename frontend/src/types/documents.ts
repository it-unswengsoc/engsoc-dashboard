/* Access labels and display colour aren't things Drive's API exposes on a
   folder — they're club-curated metadata (who's allowed to edit what),
   matched up against real folder listings by the backend. */
export type DriveAccessLevel = 'editable' | 'view-only' | 'restricted';

export interface DriveFolder {
  id: string; // Google Drive file/folder IDs are opaque strings, not auto-increment numbers
  name: string;
  fileCount: number;
  access: DriveAccessLevel;
  colour: string; // hex swatch for the folder card
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedAt: string; // ISO date string
  sizeBytes: number | null; // Drive omits size for native Docs/Sheets/Slides
  webViewLink: string | null;
}

/* ---------- Display shapes (what the documents page renders) ---------- */

export type DriveFileCategory = 'FILE' | 'FORM' | 'PHOTO' | 'VIDEO';

export interface DriveFolderCardData {
  id: string;
  name: string;
  fileCount: number;
  accessLabel: string; // "Editable" / "View only" / "Restricted"
  colour: string;
}

export interface DriveFileRowData {
  id: string;
  name: string;
  category: DriveFileCategory;
  extensionLabel: string; // e.g. "DOC", "PDF" — drives the icon badge
  modifiedLabel: string; // "2 min ago"
  sizeLabel: string; // "4.2 MB", "—"
  webViewLink: string | null;
}
