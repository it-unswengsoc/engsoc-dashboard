import { google, drive_v3 } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const GOOGLE_DRIVE_REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
const GOOGLE_DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';

/* EngSoc Drive is one shared club drive, not a personal drive per signed-in
   user — so this connects with a single service-level refresh token (the
   club's own Google account, authorized once via GET /api/auth/google and
   its refresh_token saved to GOOGLE_DRIVE_REFRESH_TOKEN) rather than each
   user's own OAuth session. Every request reuses the same connection. */
function getDriveClient(): drive_v3.Drive {
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  auth.setCredentials({ refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

/* Drive doesn't have a concept matching our "editable / view-only /
   restricted" badge or a chosen swatch colour — those are club policy, not
   API data — so real folders are matched against this config by name.
   Anything in the drive that isn't listed here still shows up, just with
   the DEFAULT_FOLDER_META fallback below. */
const FOLDER_META: Record<string, { colour: string; access: 'editable' | 'view-only' | 'restricted' }> = {
  IT: { colour: '#F1C4C9', access: 'editable' },
  Marketing: { colour: '#F4EFD3', access: 'view-only' },
  Cabinet: { colour: '#E5E7EB', access: 'restricted' },
  Spons: { colour: '#B1C9DC', access: 'view-only' },
};
const DEFAULT_FOLDER_META = { colour: '#E5E7EB', access: 'view-only' as const };

export interface DriveFolderSummary {
  id: string;
  name: string;
  fileCount: number;
  colour: string;
  access: 'editable' | 'view-only' | 'restricted';
}

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size: string | null;
  webViewLink: string | null;
}

/**
 * Lists the immediate subfolders of the configured root folder — these are
 * the "Port Directories" (IT / Marketing / Cabinet / Spons, etc).
 */
export async function listPortDirectories(): Promise<DriveFolderSummary[]> {
  const drive = getDriveClient();

  const foldersRes = await drive.files.list({
    q: `'${GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
  });

  const folders = foldersRes.data.files ?? [];

  return Promise.all(
    folders.map(async (folder) => {
      const countRes = await drive.files.list({
        q: `'${folder.id}' in parents and trashed = false`,
        fields: 'files(id)',
        pageSize: 1000,
      });

      const meta = FOLDER_META[folder.name ?? ''] ?? DEFAULT_FOLDER_META;

      return {
        id: folder.id!,
        name: folder.name!,
        fileCount: countRes.data.files?.length ?? 0,
        colour: meta.colour,
        access: meta.access,
      };
    })
  );
}

/**
 * Lists the most recently modified files directly under the root folder.
 * Drive doesn't support a single recursive "modified across the whole tree"
 * query, so this covers root-level files — good enough for a recent-activity
 * list; files nested in port directories won't appear here yet.
 */
export async function listRecentFiles(limit = 20): Promise<DriveFileSummary[]> {
  const drive = getDriveClient();

  const res = await drive.files.list({
    q: `'${GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
    orderBy: 'modifiedTime desc',
    pageSize: limit,
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
  });

  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    modifiedTime: f.modifiedTime!,
    size: f.size ?? null,
    webViewLink: f.webViewLink ?? null,
  }));
}
