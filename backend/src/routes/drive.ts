import { Router, Request, Response } from 'express';
import { listPortDirectories, listRecentFiles } from '../functions/drive';
import { verifyAuthToken } from './auth';

const router = Router();

/**
 * GET /api/drive/folders
 * Lists the shared EngSoc Drive's top-level "port directories".
 */
router.get('/folders', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const folders = await listPortDirectories();
    res.status(200).json({ status: 'success', data: folders });
  } catch (error) {
    console.error('List drive folders error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load Drive folders' });
  }
});

/**
 * GET /api/drive/files/recent
 * Lists the most recently modified files in the shared drive.
 */
router.get('/files/recent', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const files = await listRecentFiles(limit);
    res.status(200).json({ status: 'success', data: files });
  } catch (error) {
    console.error('List recent drive files error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load recent files' });
  }
});

export default router;
