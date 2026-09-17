/* Access labels and display colour aren't things Drive's API exposes on a
   folder — they're club-curated metadata (who's allowed to edit what),
   matched up against real folder listings by the backend. Any Shared Drive
   the backend doesn't have curated metadata for still comes through, just
   with a neutral default style. */
export type DriveAccessLevel = 'editable' | 'view-only' | 'restricted';

export interface DriveFolder {
  id: string; // Google Drive file/folder IDs are opaque strings, not auto-increment numbers
  name: string;
  fileCount: number;
  access: DriveAccessLevel;
  colour: string; // hex swatch for the folder card
}

/* One item inside a Shared Drive or a folder within it — a folder is
   navigable (clicking it lists its own children), a file opens webViewLink. */
export interface DriveEntry {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: string;
  modifiedAt: string; // ISO date string
  sizeBytes: number | null; // Drive omits size for native Docs/Sheets/Slides, and for folders
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

export interface DriveEntryRowData {
  id: string;
  name: string;
  type: 'folder' | 'file';
  category: DriveFileCategory; // meaningless for a folder row, but keeps one row shape
  extensionLabel: string; // e.g. "DOC", "PDF" — drives the icon badge; ignored for folders
  modifiedLabel: string; // "2 min ago"
  sizeLabel: string; // "4.2 MB", "—"
  webViewLink: string | null;
}
