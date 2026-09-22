import { Router, Request, Response } from 'express';
import { verifyAuthToken } from './auth';
import { getUserGoogleRefreshToken } from '../functions/auth';
import { listDepartments, listDriveEntries } from '../functions/drive';

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

export default router;
