import { Router, Request, Response } from 'express';
import { listPortDirectories, listRecentFiles } from '../functions/drive';

const router = Router();

/* No verifyAuthToken here (unlike most other routes) — the documents page
   fetches this server-side from a Next.js Server Component, which has no
   access to the browser's sessionStorage-held JWT at all, so an
   auth-gated route would 401 every single time regardless of whether
   Drive is even connected. This mirrors GET /events, which is public for
   the same reason. Fine for now since this is read-only, shared (not
   per-user) data, and the frontend page itself is already gated by the
   client-side login check in dashboard/layout.tsx. */

/**
 * GET /api/drive/folders
 * Lists the shared EngSoc Drive's top-level "port directories".
 */
router.get('/folders', async (req: Request, res: Response) => {
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
router.get('/files/recent', async (req: Request, res: Response) => {
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
