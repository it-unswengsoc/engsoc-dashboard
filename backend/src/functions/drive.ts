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

/* EngSoc's Drive is organised as top-level Shared Drives (Arc Delegate,
   Careers, HR, IT, ...) — there's no single "root folder" containing them.
   This is the allow-list of which ones become "Port Directories" on the
   documents page: anything the connected account can see but isn't listed
   here (HR, Executive, Chairperson, ...) is deliberately never shown or
   queried, since this page is visible to every signed-in member. Rename or
   add entries here to change what shows up — matched against the Shared
   Drive's exact name in Google Drive. */
const PORT_DIRECTORIES: Record<string, { colour: string; access: 'editable' | 'view-only' | 'restricted' }> = {
  IT: { colour: '#F1C4C9', access: 'editable' },
  Marketing: { colour: '#F4EFD3', access: 'view-only' },
  Cabinet: { colour: '#E5E7EB', access: 'restricted' },
  Spons: { colour: '#B1C9DC', access: 'view-only' },
};

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
 * Lists the Shared Drives in PORT_DIRECTORIES that the connected account can
 * actually see, with each one's file count and curated colour/access badge.
 */
export async function listPortDirectories(): Promise<DriveFolderSummary[]> {
  const drive = getDriveClient();

  const drivesRes = await drive.drives.list({ fields: 'drives(id, name)', pageSize: 100 });
  const allDrives = drivesRes.data.drives ?? [];
  const allowedDrives = allDrives.filter((d) => d.name && PORT_DIRECTORIES[d.name]);

  return Promise.all(
    allowedDrives.map(async (sharedDrive) => {
      const countRes = await drive.files.list({
        q: 'trashed = false',
        driveId: sharedDrive.id!,
        corpora: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: 'files(id)',
        pageSize: 1000,
      });

      const meta = PORT_DIRECTORIES[sharedDrive.name!];

      return {
        id: sharedDrive.id!,
        name: sharedDrive.name!,
        fileCount: countRes.data.files?.length ?? 0,
        colour: meta.colour,
        access: meta.access,
      };
    })
  );
}

/**
 * Lists the most recently modified files across the allow-listed Shared
 * Drives (see PORT_DIRECTORIES) — deliberately not every drive the
 * connected account can see.
 */
export async function listRecentFiles(limit = 20): Promise<DriveFileSummary[]> {
  const drive = getDriveClient();

  const drivesRes = await drive.drives.list({ fields: 'drives(id, name)', pageSize: 100 });
  const allowedDriveIds = (drivesRes.data.drives ?? [])
    .filter((d) => d.name && PORT_DIRECTORIES[d.name])
    .map((d) => d.id!);

  const perDriveResults = await Promise.all(
    allowedDriveIds.map((driveId) =>
      drive.files.list({
        q: "mimeType != 'application/vnd.google-apps.folder' and trashed = false",
        driveId,
        corpora: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        orderBy: 'modifiedTime desc',
        pageSize: limit,
        fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
      })
    )
  );

  const files = perDriveResults.flatMap((res) => res.data.files ?? []);

  return files
    .sort((a, b) => new Date(b.modifiedTime!).getTime() - new Date(a.modifiedTime!).getTime())
    .slice(0, limit)
    .map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      modifiedTime: f.modifiedTime!,
      size: f.size ?? null,
      webViewLink: f.webViewLink ?? null,
    }));
}
