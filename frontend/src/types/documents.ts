/* What the signed-in member can actually do with this drive/file/folder,
   straight from Google Drive's own `capabilities` for their account — not a
   guess or a hardcoded lookup table. canAddChildren is only meaningful on a
   folder or a Shared Drive's own root (always false on a plain file). */
export interface DriveCapabilities {
  canEdit: boolean;
  canAddChildren: boolean;
  canRename: boolean;
  canDelete: boolean;
}

export interface DriveFolder {
  id: string; // Google Drive file/folder IDs are opaque strings, not auto-increment numbers
  name: string;
  fileCount: number;
  colour: string; // hex swatch for the folder card — cosmetic only, not derived from real Drive data
  webViewLink: string;
  capabilities: DriveCapabilities;
}

/* A named cluster of related Shared Drives — "Careers", "Careers Directors"
   and "Careers External" all live under one "Careers" department, grouped
   by the backend purely from each drive's name (see DEPARTMENT_DEFS in
   backend/src/functions/drive.ts). Mirrors the department sidebar on the
   documents page. */
export interface DriveDepartment {
  name: string;
  colour: string;
  drives: DriveFolder[];
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
  capabilities: DriveCapabilities;
}

/* One hit from the global header search — spans every Shared Drive (and My
   Drive) the member can see, not just whatever's open in the column
   browser, so it carries its own drive name for context instead of relying
   on the browser's current location. */
export interface DriveSearchResult {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: string;
  modifiedAt: string;
  webViewLink: string | null;
  driveName: string;
}

/* ---------- Display shapes (what the documents page renders) ---------- */

export type DriveFileCategory = 'FILE' | 'FORM' | 'PHOTO' | 'VIDEO';

export interface DriveFolderCardData {
  id: string;
  name: string;
  fileCount: number;
  accessLabel: string; // "Editable" / "View only" — derived from real capabilities.canEdit
  colour: string;
  webViewLink: string;
  capabilities: DriveCapabilities;
}

export interface DriveDepartmentData {
  name: string;
  colour: string;
  drives: DriveFolderCardData[];
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
  capabilities: DriveCapabilities;
}

export interface DriveSearchResultData {
  id: string;
  name: string;
  type: 'folder' | 'file';
  extensionLabel: string;
  driveName: string;
  modifiedLabel: string;
  webViewLink: string | null;
}

/* One node in the Finder-style column browser — unifies a top-level Shared
   Drive and a file/folder within one into a single shape, so the column,
   selection and preview-pane code don't need to branch on which kind of
   thing they're looking at. `navigable` is what decides whether opening a
   node reveals another column (a drive or folder) or just opens the item
   directly (a file, via webViewLink). */
export type BrowserNode =
  | {
      kind: 'drive';
      id: string;
      driveId: string; // same as id — kept alongside it so BrowserNode is uniform across both kinds
      name: string;
      navigable: true;
      accessLabel: string;
      fileCount: number;
      webViewLink: string | null;
      capabilities: DriveCapabilities;
    }
  | {
      kind: 'entry';
      id: string;
      driveId: string; // the Shared Drive this entry lives in, needed to fetch its children
      name: string;
      navigable: boolean; // true for a folder, false for a file
      type: 'folder' | 'file';
      category: DriveFileCategory;
      extensionLabel: string;
      modifiedLabel: string;
      sizeLabel: string;
      webViewLink: string | null;
      accessLabel: string;
      capabilities: DriveCapabilities;
    };
