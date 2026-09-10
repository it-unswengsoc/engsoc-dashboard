"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drive_1 = require("../functions/drive");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
/**
 * GET /api/drive/folders
 * Lists the shared EngSoc Drive's top-level "port directories".
 */
router.get('/folders', auth_1.verifyAuthToken, async (req, res) => {
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
 * GET /api/drive/files/recent
 * Lists the most recently modified files in the shared drive.
 */
router.get('/files/recent', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const files = await (0, drive_1.listRecentFiles)(limit);
        res.status(200).json({ status: 'success', data: files });
    }
    catch (error) {
        console.error('List recent drive files error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load recent files' });
    }
});
exports.default = router;
//# sourceMappingURL=drive.js.map