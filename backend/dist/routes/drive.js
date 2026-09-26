"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("./auth");
const auth_2 = require("../functions/auth");
const google_1 = require("../functions/google");
const drive_1 = require("../functions/drive");
const router = (0, express_1.Router)();
/**
 * GET /drive/folders
 * Lists every Shared Drive the signed-in member's own Google account can
 * see, grouped into departments (see listDepartments). `connected: false`
 * means this account has no stored Google refresh token yet (a
 * password-only account, or a Google account that hasn't signed in since
 * this feature shipped) — the frontend prompts them to sign out and back in
 * with Google in that case.
 */
router.get('/folders', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(200).json({ status: 'success', data: [], connected: false });
        }
        const departments = await (0, drive_1.listDepartments)(refreshToken);
        res.status(200).json({ status: 'success', data: departments, connected: true });
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
/**
 * GET /drive/search?q=...
 * Full-text searches every file the signed-in member's own Google account
 * can see across every Shared Drive (and My Drive) — backs the global
 * header search, deliberately not scoped to whatever's currently open in
 * the column browser.
 */
router.get('/search', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        if (!query) {
            return res.status(200).json({ status: 'success', data: [], connected: true });
        }
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(200).json({ status: 'success', data: [], connected: false });
        }
        const results = await (0, drive_1.searchDriveFiles)(refreshToken, query);
        res.status(200).json({ status: 'success', data: results, connected: true });
    }
    catch (error) {
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
router.post('/folders/create', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const { driveId, parentId, name } = req.body;
        if (!driveId || !name?.trim()) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: driveId, name' });
        }
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
        }
        const folder = await (0, drive_1.createDriveFolder)(refreshToken, driveId, parentId, name.trim());
        res.status(201).json({ status: 'success', data: folder });
    }
    catch (error) {
        console.error('Create drive folder error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create folder' });
    }
});
/**
 * POST /drive/files/create
 * Creates a new blank Google Workspace file (Doc/Sheet/...). Body:
 * { driveId, parentId?, name, mimeType }.
 */
router.post('/files/create', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const { driveId, parentId, name, mimeType } = req.body;
        if (!driveId || !name?.trim() || !mimeType) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields: driveId, name, mimeType' });
        }
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
        }
        const file = await (0, drive_1.createDriveFile)(refreshToken, driveId, parentId, name.trim(), mimeType);
        res.status(201).json({ status: 'success', data: file });
    }
    catch (error) {
        console.error('Create drive file error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create file' });
    }
});
/**
 * PATCH /drive/entries/:fileId
 * Renames a file or folder. Body: { name }.
 */
router.patch('/entries/:fileId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const { fileId } = req.params;
        const { name } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ status: 'error', message: 'Missing required field: name' });
        }
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
        }
        const entry = await (0, drive_1.renameDriveEntry)(refreshToken, fileId, name.trim());
        res.status(200).json({ status: 'success', data: entry });
    }
    catch (error) {
        console.error('Rename drive entry error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to rename' });
    }
});
/**
 * DELETE /drive/entries/:fileId
 * Moves a file or folder to Drive's own Trash (see deleteDriveEntry) — a
 * recoverable action, not a permanent delete. Google enforces
 * capabilities.canDelete server-side same as every other write here.
 */
router.delete('/entries/:fileId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const { fileId } = req.params;
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
        }
        await (0, drive_1.deleteDriveEntry)(refreshToken, fileId);
        res.status(200).json({ status: 'success' });
    }
    catch (error) {
        console.error('Delete drive entry error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete' });
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
router.get('/access-token', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(409).json({ status: 'error', message: 'Google Drive is not connected for this account' });
        }
        const { accessToken, expiresAt } = await (0, google_1.getGoogleAccessToken)(refreshToken);
        res.status(200).json({ status: 'success', data: { accessToken, expiresAt } });
    }
    catch (error) {
        console.error('Get drive access token error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get an upload token' });
    }
});
exports.default = router;
//# sourceMappingURL=drive.js.map