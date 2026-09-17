import { google, drive_v3 } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

/* EngSoc Drive is one shared club drive, not a personal drive per signed-in
   user — so this connects with a single service-level refresh token (the
   club's own Google account, authorized once via
   GET /api/auth/google?intent=drive-connect and its refresh_token saved to
   GOOGLE_DRIVE_REFRESH_TOKEN) rather than each user's own OAuth session.
   Every request reuses the same connection. */
function getDriveClient(): drive_v3.Drive {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  auth.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

/* Purely cosmetic — a colour swatch and access badge for Shared Drives whose
   name is recognised, so the ones the club actually curates keep their
   existing look. Every Shared Drive the connected account can see is listed
   now, not just these; anything not in this map falls back to
   DEFAULT_DRIVE_STYLE rather than being hidden. */
const DRIVE_STYLES: Record<string, { colour: string; access: 'editable' | 'view-only' | 'restricted' }> = {
  IT: { colour: '#F1C4C9', access: 'editable' },
  Marketing: { colour: '#F4EFD3', access: 'view-only' },
  Cabinet: { colour: '#E5E7EB', access: 'restricted' },
  Spons: { colour: '#B1C9DC', access: 'view-only' },
};
const DEFAULT_DRIVE_STYLE = { colour: '#D9DEE5', access: 'view-only' as const };

export interface DriveFolderSummary {
  id: string;
  name: string;
  fileCount: number;
  colour: string;
  access: 'editable' | 'view-only' | 'restricted';
}

export interface DriveEntry {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: string;
  modifiedTime: string;
  size: string | null;
  webViewLink: string | null;
}

/**
 * Lists every Shared Drive the connected account can see, with each one's
 * item count and a curated (or default) colour/access badge.
 */
export async function listPortDirectories(): Promise<DriveFolderSummary[]> {
  const drive = getDriveClient();

  const drivesRes = await drive.drives.list({ fields: 'drives(id, name)', pageSize: 100 });
  const allDrives = drivesRes.data.drives ?? [];

  return Promise.all(
    allDrives.map(async (sharedDrive) => {
      const countRes = await drive.files.list({
        q: 'trashed = false',
        driveId: sharedDrive.id!,
        corpora: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'files(id)',
        pageSize: 1000,
      });

      const style = (sharedDrive.name && DRIVE_STYLES[sharedDrive.name]) || DEFAULT_DRIVE_STYLE;

      return {
        id: sharedDrive.id!,
        name: sharedDrive.name!,
        fileCount: countRes.data.files?.length ?? 0,
        colour: style.colour,
        access: style.access,
      };
    })
  );
}

/**
 * Lists the immediate children (folders and files, folders first) of a
 * Shared Drive — its own root if folderId is omitted, or a specific folder
 * within it otherwise. This is what lets the documents page work like a real
 * directory browser: select a drive, then navigate into its folders.
 *
 * Only the first page (up to 1000 items, Drive's own per-request max) of a
 * folder is fetched — a folder with more than that in one level won't
 * paginate. Acceptable for a club's shared drive, not for a folder with
 * many thousands of files sitting flat in one place.
 */
export async function listDriveEntries(driveId: string, folderId?: string): Promise<DriveEntry[]> {
  const drive = getDriveClient();
  // A Shared Drive's own ID doubles as the parent ID for whatever sits at
  // its root — there's no separate synthetic "root folder" object to ask for.
  const parentId = folderId || driveId;

  const res = await drive.files.list({
    q: `'${parentId}' in parents and trashed = false`,
    driveId,
    corpora: 'drive',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    orderBy: 'folder,name',
    pageSize: 1000,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
  });

  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
    mimeType: f.mimeType!,
    modifiedTime: f.modifiedTime!,
    size: f.size ?? null,
    webViewLink: f.webViewLink ?? null,
  }));
}
