import { Router } from 'express';
import { getUserGoogleRefreshToken } from '../functions/auth';
import { getGoogleAccessToken } from '../functions/google';
import {
  listDepartments,
  listDriveEntries,
  searchDriveFiles,
  createDriveFolder,
  createDriveFile,
  renameDriveEntry,
  deleteDriveEntry,
} from '../functions/drive';
import { verifyAuthToken, type AuthedRequest } from '../middleware/auth';
import { ConflictError, ValidationError } from '../lib/errors';
import { asyncHandler, created, ok } from '../lib/http';

const router = Router();

router.use(verifyAuthToken);

/* For writes: the member's own refresh token, or a 409 if they haven't
   connected Google. Reads answer `connected: false` with no data instead. */
async function requireRefreshToken(req: AuthedRequest): Promise<string> {
  const refreshToken = await getUserGoogleRefreshToken(req.user.userId);
  if (!refreshToken) throw new ConflictError('Google Drive is not connected for this account');
  return refreshToken;
}

/**
 * GET /drive/folders?counts=0
 * Lists every Shared Drive the signed-in member's own Google account can
 * see, grouped into departments (see listDepartments). `connected: false`
 * means this account has no stored Google refresh token yet (a
 * password-only account, or a Google account that hasn't signed in since
 * this feature shipped) — the frontend prompts them to sign out and back in
 * with Google in that case.
 *
 * `?counts=0` skips the per-drive file-count fetch (up to N extra Google
 * API round-trips, one per Shared Drive) — pass it whenever the caller only
 * needs drive names (e.g. a destination picker), not the Documents page's
 * own folder cards, which is the one place that actually shows counts.
 */
router.get(
  '/folders',
  asyncHandler(async (req: AuthedRequest, res) => {
    const refreshToken = await getUserGoogleRefreshToken(req.user.userId);
    if (!refreshToken) return ok(res, [], { connected: false });

    const includeFileCounts = req.query.counts !== '0';
    ok(res, await listDepartments(refreshToken, includeFileCounts), { connected: true });
  }, 'Failed to load Drive folders'),
);

/**
 * GET /drive/entries?driveId=...&folderId=...
 * Lists the immediate contents (folders and files) of a Shared Drive —
 * its root if folderId is omitted, a specific folder within it otherwise —
 * as visible to the signed-in member's own Google account.
 */
router.get(
  '/entries',
  asyncHandler(async (req: AuthedRequest, res) => {
    const driveId = typeof req.query.driveId === 'string' ? req.query.driveId : undefined;
    const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
    if (!driveId) throw new ValidationError('Missing required query param: driveId');

    const refreshToken = await getUserGoogleRefreshToken(req.user.userId);
    if (!refreshToken) return ok(res, [], { connected: false });

    ok(res, await listDriveEntries(refreshToken, driveId, folderId), { connected: true });
  }, 'Failed to load Drive contents'),
);

/**
 * GET /drive/search?q=...
 * Full-text searches every file the signed-in member's own Google account
 * can see across every Shared Drive (and My Drive) — backs the global
 * header search, deliberately not scoped to whatever's currently open in
 * the column browser.
 */
router.get(
  '/search',
  asyncHandler(async (req: AuthedRequest, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) return ok(res, [], { connected: true });

    const refreshToken = await getUserGoogleRefreshToken(req.user.userId);
    if (!refreshToken) return ok(res, [], { connected: false });

    ok(res, await searchDriveFiles(refreshToken, query), { connected: true });
  }, 'Failed to search Drive'),
);

/**
 * POST /drive/folders/create
 * Creates a new folder. Body: { driveId, parentId?, name }. Google enforces
 * whether the member is actually allowed to (capabilities.canAddChildren on
 * the target drive/folder) — the frontend only offers this when it already
 * knows that's true, but the real check is Google's, not ours.
 */
router.post(
  '/folders/create',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { driveId, parentId, name } = req.body as { driveId?: string; parentId?: string; name?: string };
    if (!driveId || !name?.trim()) throw new ValidationError('Missing required fields: driveId, name');

    const refreshToken = await requireRefreshToken(req);
    created(res, await createDriveFolder(refreshToken, driveId, parentId, name.trim()));
  }, 'Failed to create folder'),
);

/**
 * POST /drive/files/create
 * Creates a new blank Google Workspace file (Doc/Sheet/...). Body:
 * { driveId, parentId?, name, mimeType }.
 */
router.post(
  '/files/create',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { driveId, parentId, name, mimeType } = req.body as {
      driveId?: string;
      parentId?: string;
      name?: string;
      mimeType?: string;
    };
    if (!driveId || !name?.trim() || !mimeType) {
      throw new ValidationError('Missing required fields: driveId, name, mimeType');
    }

    const refreshToken = await requireRefreshToken(req);
    created(res, await createDriveFile(refreshToken, driveId, parentId, name.trim(), mimeType));
  }, 'Failed to create file'),
);

/**
 * PATCH /drive/entries/:fileId
 * Renames a file or folder. Body: { name }.
 */
router.patch(
  '/entries/:fileId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) throw new ValidationError('Missing required field: name');

    const refreshToken = await requireRefreshToken(req);
    ok(res, await renameDriveEntry(refreshToken, req.params.fileId, name.trim()));
  }, 'Failed to rename'),
);

/**
 * DELETE /drive/entries/:fileId
 * Moves a file or folder to Drive's own Trash (see deleteDriveEntry) — a
 * recoverable action, not a permanent delete. Google enforces
 * capabilities.canDelete server-side same as every other write here.
 */
router.delete(
  '/entries/:fileId',
  asyncHandler(async (req: AuthedRequest, res) => {
    const refreshToken = await requireRefreshToken(req);
    await deleteDriveEntry(refreshToken, req.params.fileId);
    ok(res);
  }, 'Failed to delete'),
);

/**
 * GET /drive/access-token
 * Mints a short-lived Google access token for the signed-in member, for the
 * frontend to upload a file's bytes directly to Google's own upload
 * endpoint — routing real file content through this backend would hit a
 * serverless function's own request body size limit long before Drive's
 * actual (far larger) limit.
 */
router.get(
  '/access-token',
  asyncHandler(async (req: AuthedRequest, res) => {
    const refreshToken = await requireRefreshToken(req);
    const { accessToken, expiresAt } = await getGoogleAccessToken(refreshToken);
    ok(res, { accessToken, expiresAt });
  }, 'Failed to get an upload token'),
);

export default router;
