"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDepartments = listDepartments;
exports.listDriveEntries = listDriveEntries;
exports.searchDriveFiles = searchDriveFiles;
exports.createDriveFolder = createDriveFolder;
exports.createDriveFile = createDriveFile;
exports.renameDriveEntry = renameDriveEntry;
exports.uploadDriveFile = uploadDriveFile;
exports.deleteDriveEntry = deleteDriveEntry;
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
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
/* Purely cosmetic — a colour swatch for Shared Drives whose name is
   recognised, so the ones the club actually curates keep their existing
   look. Anything not in this map falls back to DEFAULT_DRIVE_COLOUR rather
   than being hidden. Whether a member can actually edit/add/rename inside
   one of these is never guessed from this list — it's read for real off
   each drive/file's own `capabilities`, per the signed-in member's own
   Google identity (see DriveCapabilities below). */
const DRIVE_COLOURS = {
    IT: '#F1C4C9',
    Marketing: '#F4EFD3',
    Cabinet: '#E5E7EB',
    Spons: '#B1C9DC',
};
const DEFAULT_DRIVE_COLOUR = '#D9DEE5';
/* Groups the flat list of Shared Drives into department buckets purely by
   name — EngSoc's Drive naming convention already clusters related drives
   under a shared prefix ("Careers", "Careers Directors", "Careers
   External", ...). Evaluated in order, first match wins.

   Cabinet also absorbs Treasury and the Arc Delegate drives (they're run out
   of Cabinet, not standalone departments of their own) alongside the old
   Governance-style drives (Executive, Chairperson, EngSoc Directors).

   The trailing entry matches everything so a drive that fits no named
   department (Internal Photos, Key Resources, ...) still shows up under
   Resources instead of being silently dropped. */
const DEPARTMENT_DEFS = [
    { name: 'Cabinet', colour: '#8B2E38', match: (n) => /^(Cabinet|Executive|Chairperson|EngSoc Directors|Treasury|Arc Del)/.test(n) },
    { name: 'IT', colour: '#3D6C94', match: (n) => n.startsWith('IT') },
    { name: 'Careers', colour: '#2A7D6F', match: (n) => n.startsWith('Careers') },
    { name: 'Marketing', colour: '#C9862E', match: (n) => n.startsWith('Marketing') },
    { name: 'Publications', colour: '#D9A441', match: (n) => n.startsWith('Publications') },
    { name: 'Outreach', colour: '#6B4FA0', match: (n) => n.startsWith('Outreach') },
    { name: 'Programs', colour: '#7C5FB5', match: (n) => n.startsWith('Programs') },
    { name: 'Socials', colour: '#B1698C', match: (n) => n.startsWith('Socials') },
    { name: 'Sponsorships', colour: '#C77FA0', match: (n) => n.startsWith('Sponsorships') },
    { name: 'HR', colour: '#ED6672', match: (n) => n.startsWith('HR') },
    { name: 'Resources', colour: '#8A94A3', match: () => true },
];
function toCapabilities(caps) {
    return {
        canEdit: caps?.canEdit ?? false,
        canAddChildren: caps?.canAddChildren ?? false,
        canRename: caps?.canRename ?? false,
        // Only a File's capabilities ever carry canDelete — a Shared Drive's own
        // capabilities don't have a "delete this whole Drive" concept, so it's
        // just absent (and defaults to false) for a drive-level summary.
        canDelete: caps?.canDelete ?? false,
    };
}
/**
 * Lists every Shared Drive the given member's own Google account can see,
 * grouped into departments (see DEPARTMENT_DEFS), with each drive's item
 * count and its real capabilities for this specific member. A department
 * with no matching drives is omitted rather than shown empty.
 */
async function listDepartments(refreshToken) {
    const drive = getDriveClient(refreshToken);
    const drivesRes = await drive.drives.list({
        // Shared Drives don't carry canDelete in their own capabilities (there's
        // no per-member "delete this whole Drive" action) — only files/folders
        // within one do, requested separately via ENTRY_FIELD_LIST below.
        fields: 'drives(id, name, capabilities(canEdit, canAddChildren, canRename))',
        pageSize: 100,
    });
    const allDrives = drivesRes.data.drives ?? [];
    const summaries = await Promise.all(allDrives.map(async (sharedDrive) => {
        const countRes = await drive.files.list({
            q: 'trashed = false',
            driveId: sharedDrive.id,
            corpora: 'drive',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: 'files(id)',
            pageSize: 1000,
        });
        return {
            id: sharedDrive.id,
            name: sharedDrive.name,
            fileCount: countRes.data.files?.length ?? 0,
            colour: DRIVE_COLOURS[sharedDrive.name] ?? DEFAULT_DRIVE_COLOUR,
            // Shared Drives don't carry a webViewLink of their own the way files
            // and folders do (drives.list has no such field) — this is Drive's
            // own stable URL scheme for opening one directly.
            webViewLink: `https://drive.google.com/drive/folders/${sharedDrive.id}`,
            capabilities: toCapabilities(sharedDrive.capabilities),
        };
    }));
    const departments = DEPARTMENT_DEFS.map((def) => ({
        name: def.name,
        colour: def.colour,
        drives: [],
    }));
    for (const summary of summaries) {
        const deptIndex = DEPARTMENT_DEFS.findIndex((def) => def.match(summary.name));
        departments[deptIndex === -1 ? departments.length - 1 : deptIndex].drives.push(summary);
    }
    return departments.filter((department) => department.drives.length > 0);
}
// The fields of a single File resource this app ever needs — shared between
// a list response (wrapped in `files(...)`) and a single create/update/get
// response (the bare field list) so the two can't drift apart.
const ENTRY_FIELD_LIST = 'id, name, mimeType, modifiedTime, size, webViewLink, capabilities(canEdit, canAddChildren, canRename, canDelete)';
const ENTRY_FIELDS = `files(${ENTRY_FIELD_LIST})`;
function toDriveEntry(f) {
    return {
        id: f.id,
        name: f.name,
        type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        size: f.size ?? null,
        webViewLink: f.webViewLink ?? null,
        capabilities: toCapabilities(f.capabilities),
    };
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
        fields: ENTRY_FIELDS,
    });
    return (res.data.files ?? []).map(toDriveEntry);
}
/**
 * Full-text searches every file the member's own Google account can see
 * across every Shared Drive (and My Drive), not just whatever's currently
 * open in the column browser — this is what backs the global header search.
 * Google's own query-string escaping rules apply to `query`: single quotes
 * inside it are escaped so a search containing one can't break the `q`
 * expression.
 */
async function searchDriveFiles(refreshToken, query) {
    const drive = getDriveClient(refreshToken);
    const escaped = query.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const [searchRes, drivesRes] = await Promise.all([
        drive.files.list({
            q: `fullText contains '${escaped}' and trashed = false`,
            corpora: 'allDrives',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            orderBy: 'modifiedTime desc',
            pageSize: 25,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink, driveId)',
        }),
        drive.drives.list({ fields: 'drives(id, name)', pageSize: 100 }),
    ]);
    const driveNames = new Map((drivesRes.data.drives ?? []).map((d) => [d.id, d.name]));
    return (searchRes.data.files ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink ?? null,
        driveId: f.driveId ?? null,
        driveName: (f.driveId && driveNames.get(f.driveId)) || 'My Drive',
    }));
}
/**
 * Creates a new folder inside a Shared Drive (at its root, if parentId is
 * omitted, or inside a specific folder within it). Google itself enforces
 * whether the member is actually allowed to — this doesn't pre-check
 * capabilities.canAddChildren, it just lets the request fail if not (the
 * frontend disables the option in the first place using capabilities from
 * listDepartments/listDriveEntries, this is the same trust boundary as any
 * other write here).
 */
async function createDriveFolder(refreshToken, driveId, parentId, name) {
    const drive = getDriveClient(refreshToken);
    const res = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId || driveId],
        },
        supportsAllDrives: true,
        fields: ENTRY_FIELD_LIST,
    });
    return toDriveEntry(res.data);
}
/**
 * Creates a new blank Google Workspace file (Doc, Sheet, ...) inside a
 * Shared Drive. `mimeType` is expected to be one of the
 * application/vnd.google-apps.* editor types — Drive creates it empty and
 * ready to open, no file content needs to be supplied.
 */
async function createDriveFile(refreshToken, driveId, parentId, name, mimeType) {
    const drive = getDriveClient(refreshToken);
    const res = await drive.files.create({
        requestBody: {
            name,
            mimeType,
            parents: [parentId || driveId],
        },
        supportsAllDrives: true,
        fields: ENTRY_FIELD_LIST,
    });
    return toDriveEntry(res.data);
}
/**
 * Renames an existing file or folder. Google enforces capabilities.canRename
 * server-side same as createDriveFolder/createDriveFile above.
 */
async function renameDriveEntry(refreshToken, fileId, name) {
    const drive = getDriveClient(refreshToken);
    const res = await drive.files.update({
        fileId,
        requestBody: { name },
        supportsAllDrives: true,
        fields: ENTRY_FIELD_LIST,
    });
    return toDriveEntry(res.data);
}
/**
 * Uploads a small file's bytes directly (used for the odd case that ever
 * needs to go through our own backend rather than the frontend's direct
 * upload to Google — see functions/google.ts's getGoogleAccessToken for why
 * the frontend uploads straight to Google instead for anything of real
 * size). Not currently wired to a route; kept for completeness/parity with
 * the other create* functions.
 */
async function uploadDriveFile(refreshToken, driveId, parentId, name, mimeType, buffer) {
    const drive = getDriveClient(refreshToken);
    const res = await drive.files.create({
        requestBody: { name, parents: [parentId || driveId] },
        media: { mimeType, body: stream_1.Readable.from(buffer) },
        supportsAllDrives: true,
        fields: ENTRY_FIELD_LIST,
    });
    return toDriveEntry(res.data);
}
/**
 * Moves a file or folder to Drive's own Trash — recoverable there for 30
 * days by default, the same outcome as choosing "Remove" in Drive's own UI,
 * rather than a permanent drive.files.delete(). Google enforces
 * capabilities.canDelete server-side same as every other write here; the
 * frontend only offers this when it already knows that's true.
 */
async function deleteDriveEntry(refreshToken, fileId) {
    const drive = getDriveClient(refreshToken);
    await drive.files.update({
        fileId,
        requestBody: { trashed: true },
        supportsAllDrives: true,
    });
}
//# sourceMappingURL=drive.js.map