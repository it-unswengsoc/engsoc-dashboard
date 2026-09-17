"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drive_1 = require("../functions/drive");
const router = (0, express_1.Router)();
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
 * Lists every Shared Drive the connected account can see.
 */
router.get('/folders', async (req, res) => {
    try {
        const folders = await (0, drive_1.listPortDirectories)();
        res.status(200).json({ status: 'success', data: folders });
    }
    catch (error) {
        console.error('List drive folders error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load Drive folders' });
    }
});
/**
 * GET /api/drive/entries?driveId=...&folderId=...
 * Lists the immediate contents (folders and files) of a Shared Drive —
 * its root if folderId is omitted, a specific folder within it otherwise.
 */
router.get('/entries', async (req, res) => {
    try {
        const driveId = typeof req.query.driveId === 'string' ? req.query.driveId : undefined;
        const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
        if (!driveId) {
            return res.status(400).json({ status: 'error', message: 'Missing required query param: driveId' });
        }
        const entries = await (0, drive_1.listDriveEntries)(driveId, folderId);
        res.status(200).json({ status: 'success', data: entries });
    }
    catch (error) {
        console.error('List drive entries error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load Drive contents' });
    }
});
exports.default = router;
//# sourceMappingURL=drive.js.map