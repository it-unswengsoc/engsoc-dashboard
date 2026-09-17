"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("./auth");
const auth_2 = require("../functions/auth");
const drive_1 = require("../functions/drive");
const router = (0, express_1.Router)();
/**
 * GET /drive/folders
 * Lists every Shared Drive the signed-in member's own Google account can
 * see. `connected: false` means this account has no stored Google refresh
 * token yet (a password-only account, or a Google account that hasn't
 * signed in since this feature shipped) — the frontend prompts them to sign
 * out and back in with Google in that case.
 */
router.get('/folders', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(200).json({ status: 'success', data: [], connected: false });
        }
        const folders = await (0, drive_1.listPortDirectories)(refreshToken);
        res.status(200).json({ status: 'success', data: folders, connected: true });
    }
    catch (error) {
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
router.get('/entries', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const driveId = typeof req.query.driveId === 'string' ? req.query.driveId : undefined;
        const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
        if (!driveId) {
            return res.status(400).json({ status: 'error', message: 'Missing required query param: driveId' });
        }
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(200).json({ status: 'success', data: [], connected: false });
        }
        const entries = await (0, drive_1.listDriveEntries)(refreshToken, driveId, folderId);
        res.status(200).json({ status: 'success', data: entries, connected: true });
    }
    catch (error) {
        console.error('List drive entries error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load Drive contents' });
    }
});
exports.default = router;
//# sourceMappingURL=drive.js.map