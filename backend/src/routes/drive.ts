import { Router, Request, Response } from 'express';
import { verifyAuthToken } from './auth';
import { getUserGoogleRefreshToken } from '../functions/auth';
import { getGoogleAccessToken } from '../functions/google';
import {
  listDepartments,
  listDriveEntries,
  searchDriveFiles,
  createDriveFolder,
  createDriveFile,
  renameDriveEntry,
} from '../functions/drive';

const router = Router();

/**
 * GET /drive/folders
 * Lists every Shared Drive the signed-in member's own Google account can
 * see, grouped into departments (see listDepartments). `connected: false`
 * means this account has no stored Google refresh token yet (a
 * password-only account, or a Google account that hasn't signed in since
 * this feature shipped) — the frontend prompts them to sign out and back in
 * with Google in that case.
 */
router.get('/folders', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const refreshToken = await getUserGoogleRefreshToken(user.userId);

    if (!refreshToken) {
      return res.status(200).json({ status: 'success', data: [], connected: false });
    }

    const departments = await listDepartments(refreshToken);
    res.status(200).json({ status: 'success', data: departments, connected: true });
  } catch (error) {
    console.error('List drive folders error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load Drive folders' });
  }
});

/**
 * GET /drive/entries?driveId=...&folderId=...
 * Lists the immediate contents (folders and files) of a Shared Drive —
 * its root if folderId is omitted, a specific folder within it otherwise —
 * as visible to the signed-in member's own Google account.
 */
router.get('/entries', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const driveId = typeof req.query.driveId === 'string' ? req.query.driveId : undefined;
    const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;

    if (!driveId) {
      return res.status(400).json({ status: 'error', message: 'Missing required query param: driveId' });
    }

    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(200).json({ status: 'success', data: [], connected: false });
    }

    const entries = await listDriveEntries(refreshToken, driveId, folderId);
    res.status(200).json({ status: 'success', data: entries, connected: true });
  } catch (error) {
    console.error('List drive entries error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load Drive contents' });
  }
});

/**
 * GET /drive/search?q=...
 * Full-text searches every file the signed-in member's own Google account
 * can see across every Shared Drive (and My Drive) — backs the global
 * header search, deliberately not scoped to whatever's currently open in
 * the column browser.
 */
router.get('/search', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      return res.status(200).json({ status: 'success', data: [], connected: true });
    }

    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(200).json({ status: 'success', data: [], connected: false });
    }

    const results = await searchDriveFiles(refreshToken, query);
    res.status(200).json({ status: 'success', data: results, connected: true });
  } catch (error) {
    console.error('Search drive error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to search Drive' });
  }
});

/**
 * POST /drive/folders/create
 * Creates a new folder. Body: { driveId, parentId?, name }. Google enforces
 * whether the member is actually allowed to (capabilities.canAddChildren on
 * the target drive/folder) — the frontend only offers this when it already
 * knows that's true, but the real check is Google's, not ours.
 */
router.post('/folders/create', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { driveId, parentId, name } = req.body as { driveId?: string; parentId?: string; name?: string };
    if (!driveId || !name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields: driveId, name' });
    }

    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
    }

    const folder = await createDriveFolder(refreshToken, driveId, parentId, name.trim());
    res.status(201).json({ status: 'success', data: folder });
  } catch (error) {
    console.error('Create drive folder error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create folder' });
  }
});

/**
 * POST /drive/files/create
 * Creates a new blank Google Workspace file (Doc/Sheet/...). Body:
 * { driveId, parentId?, name, mimeType }.
 */
router.post('/files/create', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { driveId, parentId, name, mimeType } = req.body as {
      driveId?: string;
      parentId?: string;
      name?: string;
      mimeType?: string;
    };
    if (!driveId || !name?.trim() || !mimeType) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields: driveId, name, mimeType' });
    }

    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
    }

    const file = await createDriveFile(refreshToken, driveId, parentId, name.trim(), mimeType);
    res.status(201).json({ status: 'success', data: file });
  } catch (error) {
    console.error('Create drive file error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create file' });
  }
});

/**
 * PATCH /drive/entries/:fileId
 * Renames a file or folder. Body: { name }.
 */
router.patch('/entries/:fileId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { fileId } = req.params;
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Missing required field: name' });
    }

    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
    }

    const entry = await renameDriveEntry(refreshToken, fileId, name.trim());
    res.status(200).json({ status: 'success', data: entry });
  } catch (error) {
    console.error('Rename drive entry error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to rename' });
  }
});

/**
 * GET /drive/access-token
 * Mints a short-lived Google access token for the signed-in member, for the
 * frontend to upload a file's bytes directly to Google's own upload
 * endpoint — routing real file content through this backend would hit a
 * serverless function's own request body size limit long before Drive's
 * actual (far larger) limit.
 */
router.get('/access-token', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const refreshToken = await getUserGoogleRefreshToken(user.userId);
    if (!refreshToken) {
      return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
    }

    const { accessToken, expiresAt } = await getGoogleAccessToken(refreshToken);
    res.status(200).json({ status: 'success', data: { accessToken, expiresAt } });
  } catch (error) {
    console.error('Get drive access token error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get an upload token' });
  }
});

export default router;
