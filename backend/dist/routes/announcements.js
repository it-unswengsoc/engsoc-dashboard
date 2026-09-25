"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const announcements_1 = require("../functions/announcements");
const auth_1 = require("./auth");
const admin_1 = require("../functions/admin");
const router = (0, express_1.Router)();
/* Only the author or an admin can delete their own announcement/comment —
   anyone with a valid token could before this (POST already needed
   director/executive/admin, but delete had no check at all). */
async function canDelete(userId, authorId) {
    if (authorId === userId)
        return true;
    return (0, admin_1.isUserAdmin)(userId);
}
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
 * Creates a new announcement authored by the requesting user. Director,
 * executive or admin only.
 */
router.post('/', auth_1.verifyAuthToken, (0, auth_1.requireRole)(['director', 'executive', 'admin']), async (req, res) => {
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
 * Deletes an announcement. Author or admin only.
 */
router.delete('/:announcementId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const announcementId = parseInt(req.params.announcementId);
        const user = req.user;
        if (isNaN(announcementId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid announcement ID',
            });
        }
        const authorId = await (0, announcements_1.getAnnouncementAuthorId)(announcementId);
        if (authorId === null) {
            return res.status(404).json({ status: 'error', message: 'Announcement not found' });
        }
        if (!(await canDelete(user.userId, authorId))) {
            return res.status(403).json({ status: 'error', message: 'Only the author or an admin can delete this' });
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
/**
 * GET /announcements/:announcementId/comments
 * Lists every comment on an announcement, oldest first.
 */
router.get('/:announcementId/comments', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const announcementId = parseInt(req.params.announcementId);
        if (isNaN(announcementId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid announcement ID' });
        }
        const comments = await (0, announcements_1.getComments)(announcementId);
        res.status(200).json({ status: 'success', data: comments });
    }
    catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});
/**
 * POST /announcements/:announcementId/comments
 * Adds a comment, authored by the requesting user. Anyone signed in can
 * comment — only posting the announcement itself is director/exec/admin
 * only.
 */
router.post('/:announcementId/comments', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const announcementId = parseInt(req.params.announcementId);
        const user = req.user;
        const { content } = req.body;
        if (isNaN(announcementId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid announcement ID' });
        }
        if (!content?.trim()) {
            return res.status(400).json({ status: 'error', message: 'Missing required field: content' });
        }
        const comment = await (0, announcements_1.addComment)(announcementId, user.userId, content.trim());
        if (!comment) {
            return res.status(404).json({ status: 'error', message: 'Announcement not found' });
        }
        res.status(201).json({ status: 'success', message: 'Comment added', data: comment });
    }
    catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});
/**
 * DELETE /announcements/:announcementId/comments/:commentId
 * Deletes a comment. Author or admin only.
 */
router.delete('/:announcementId/comments/:commentId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const user = req.user;
        if (isNaN(commentId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid comment ID' });
        }
        const authorId = await (0, announcements_1.getCommentAuthorId)(commentId);
        if (authorId === null) {
            return res.status(404).json({ status: 'error', message: 'Comment not found' });
        }
        if (!(await canDelete(user.userId, authorId))) {
            return res.status(403).json({ status: 'error', message: 'Only the author or an admin can delete this' });
        }
        const deleted = await (0, announcements_1.deleteComment)(commentId);
        if (!deleted) {
            return res.status(404).json({ status: 'error', message: 'Comment not found' });
        }
        res.status(200).json({ status: 'success', message: 'Comment deleted' });
    }
    catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=announcements.js.map