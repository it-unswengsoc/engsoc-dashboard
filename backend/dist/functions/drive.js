"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPortDirectories = listPortDirectories;
exports.listDriveEntries = listDriveEntries;
const googleapis_1 = require("googleapis");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
/* Reads as the signed-in member's own Google identity (their stored
   google_refresh_token — see functions/auth.ts) rather than one shared
   service account, so a drive only shows up here if that member can
   actually see it in their own Google Drive — same access boundary Google
   itself already enforces, not a second one this app has to maintain. */
function getDriveClient(refreshToken) {
    const auth = new googleapis_1.google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
    auth.setCredentials({ refresh_token: refreshToken });
    return googleapis_1.google.drive({ version: 'v3', auth });
}
/* Purely cosmetic — a colour swatch and access badge for Shared Drives whose
   name is recognised, so the ones the club actually curates keep their
   existing look. Anything not in this map falls back to
   DEFAULT_DRIVE_STYLE rather than being hidden. */
const DRIVE_STYLES = {
    IT: { colour: '#F1C4C9', access: 'editable' },
    Marketing: { colour: '#F4EFD3', access: 'view-only' },
    Cabinet: { colour: '#E5E7EB', access: 'restricted' },
    Spons: { colour: '#B1C9DC', access: 'view-only' },
};
const DEFAULT_DRIVE_STYLE = { colour: '#D9DEE5', access: 'view-only' };
/**
 * Lists every Shared Drive the given member's own Google account can see,
 * with each one's item count and a curated (or default) colour/access badge.
 */
async function listPortDirectories(refreshToken) {
    const drive = getDriveClient(refreshToken);
    const drivesRes = await drive.drives.list({ fields: 'drives(id, name)', pageSize: 100 });
    const allDrives = drivesRes.data.drives ?? [];
    return Promise.all(allDrives.map(async (sharedDrive) => {
        const countRes = await drive.files.list({
            q: 'trashed = false',
            driveId: sharedDrive.id,
            corpora: 'drive',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: 'files(id)',
            pageSize: 1000,
        });
        const style = (sharedDrive.name && DRIVE_STYLES[sharedDrive.name]) || DEFAULT_DRIVE_STYLE;
        return {
            id: sharedDrive.id,
            name: sharedDrive.name,
            fileCount: countRes.data.files?.length ?? 0,
            colour: style.colour,
            access: style.access,
        };
    }));
}
/**
 * Lists the immediate children (folders and files, folders first) of a
 * Shared Drive — its own root if folderId is omitted, or a specific folder
 * within it otherwise — as visible to the given member's own Google account.
 * This is what lets the documents page work like a real directory browser:
 * select a drive, then navigate into its folders.
 *
 * Only the first page (up to 1000 items, Drive's own per-request max) of a
 * folder is fetched — a folder with more than that in one level won't
 * paginate. Acceptable for a club's shared drive, not for a folder with
 * many thousands of files sitting flat in one place.
 */
async function listDriveEntries(refreshToken, driveId, folderId) {
    const drive = getDriveClient(refreshToken);
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
        id: f.id,
        name: f.name,
        type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        size: f.size ?? null,
        webViewLink: f.webViewLink ?? null,
    }));
}
//# sourceMappingURL=drive.js.map