"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const announcements_1 = require("../functions/announcements");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
/**
 * GET /announcements
 * Retrieves all announcements. Requires authentication because
 * isLikedByMe is computed per requesting user.
 */
router.get('/', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const announcements = await (0, announcements_1.getAllAnnouncements)(user.userId);
        res.status(200).json({
            status: 'success',
            data: announcements,
        });
    }
    catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * POST /announcements
 * Creates a new announcement authored by the requesting user.
 */
router.post('/', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const { content, imageUrl } = req.body;
        if (!content) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required field: content',
            });
        }
        const announcement = await (0, announcements_1.createAnnouncement)({
            authorId: user.userId,
            content,
            imageUrl,
        });
        if (!announcement) {
            return res.status(400).json({
                status: 'error',
                message: 'Failed to create announcement',
            });
        }
        res.status(201).json({
            status: 'success',
            message: 'Announcement created successfully',
            data: announcement,
        });
    }
    catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * DELETE /announcements/:announcementId
 * Deletes an announcement. Requires authentication.
 */
router.delete('/:announcementId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const announcementId = parseInt(req.params.announcementId);
        if (isNaN(announcementId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid announcement ID',
            });
        }
        const deleted = await (0, announcements_1.deleteAnnouncement)(announcementId);
        if (!deleted) {
            return res.status(404).json({
                status: 'error',
                message: 'Announcement not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Announcement deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * POST /announcements/:announcementId/like
 * Likes an announcement on behalf of the requesting user.
 */
router.post('/:announcementId/like', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const announcementId = parseInt(req.params.announcementId);
        const user = req.user;
        if (isNaN(announcementId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid announcement ID',
            });
        }
        const announcement = await (0, announcements_1.likeAnnouncement)(announcementId, user.userId);
        if (!announcement) {
            return res.status(404).json({
                status: 'error',
                message: 'Announcement not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Announcement liked',
            data: announcement,
        });
    }
    catch (error) {
        console.error('Like announcement error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * DELETE /announcements/:announcementId/like
 * Removes the requesting user's like from an announcement.
 */
router.delete('/:announcementId/like', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const announcementId = parseInt(req.params.announcementId);
        const user = req.user;
        if (isNaN(announcementId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid announcement ID',
            });
        }
        const announcement = await (0, announcements_1.unlikeAnnouncement)(announcementId, user.userId);
        if (!announcement) {
            return res.status(404).json({
                status: 'error',
                message: 'Announcement not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Announcement unliked',
            data: announcement,
        });
    }
    catch (error) {
        console.error('Unlike announcement error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=announcements.js.map