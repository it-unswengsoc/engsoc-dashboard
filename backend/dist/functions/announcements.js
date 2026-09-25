"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAnnouncements = getAllAnnouncements;
exports.createAnnouncement = createAnnouncement;
exports.deleteAnnouncement = deleteAnnouncement;
exports.getAnnouncementAuthorId = getAnnouncementAuthorId;
exports.likeAnnouncement = likeAnnouncement;
exports.unlikeAnnouncement = unlikeAnnouncement;
exports.getComments = getComments;
exports.addComment = addComment;
exports.deleteComment = deleteComment;
exports.getCommentAuthorId = getCommentAuthorId;
const announcements_1 = require("../database/announcements");
const users_1 = require("./users");
const mentions_1 = require("./mentions");
const notifications_1 = require("./notifications");
/**
 * Retrieves all announcements, newest first, with isLikedByMe computed for
 * the requesting user. Returns an empty array if none exist.
 */
async function getAllAnnouncements(currentUserId) {
    try {
        return await (0, announcements_1.dbGetAllAnnouncements)(currentUserId);
    }
    catch (error) {
        console.error('Get all announcements error:', error);
        return [];
    }
}
/**
 * Creates a new announcement authored by the given user, then (best-effort,
 * never blocking the announcement itself):
 *   - notifies every other active member that a new announcement was posted
 *   - separately notifies anyone @mentioned in its content (by name or by
 *     portfolio — see functions/mentions.ts), even though they'll also get
 *     the broadcast above; it's a different notification (you were
 *     specifically tagged, not just "something new happened")
 * Returns the newly created announcement, or null if creation failed.
 */
async function createAnnouncement(input) {
    try {
        const announcement = await (0, announcements_1.dbCreateAnnouncement)(input);
        if (!announcement)
            return null;
        void notifyOnAnnouncement(announcement, input.authorId);
        return announcement;
    }
    catch (error) {
        console.error('Create announcement error:', error);
        return null;
    }
}
async function notifyOnAnnouncement(announcement, authorId) {
    try {
        const posterName = announcement.authorName ?? 'Someone';
        const excerpt = announcement.content.length > 140 ? `${announcement.content.slice(0, 140)}…` : announcement.content;
        const directory = await (0, users_1.listDirectoryUsers)();
        const broadcastRecipients = directory.filter((u) => u.id !== authorId);
        // Excludes the author already (see extractMentionedUserIds) — everyone
        // left here gets both the broadcast above and this separate tag alert.
        const mentionedIds = await (0, mentions_1.extractMentionedUserIds)(announcement.content, authorId);
        await (0, notifications_1.createNotificationsBulk)([
            ...broadcastRecipients.map((u) => ({
                userId: u.id,
                type: 'announcement',
                title: `New announcement from ${posterName}`,
                message: excerpt,
            })),
            ...mentionedIds.map((userId) => ({
                userId,
                type: 'alert',
                title: `${posterName} tagged you in an announcement`,
                message: excerpt,
            })),
        ]);
    }
    catch (error) {
        console.error('Notify on announcement error:', error);
    }
}
/**
 * Deletes an announcement by its ID.
 * Returns true if the announcement was deleted, or false if no announcement
 * exists with the given ID.
 */
async function deleteAnnouncement(announcementId) {
    try {
        return await (0, announcements_1.dbDeleteAnnouncement)(announcementId);
    }
    catch (error) {
        console.error('Delete announcement error:', error);
        return false;
    }
}
/**
 * Looks up who authored an announcement — used by the route layer to check
 * "author or admin" before allowing a delete.
 */
async function getAnnouncementAuthorId(announcementId) {
    return (0, announcements_1.dbGetAnnouncementAuthorId)(announcementId);
}
/**
 * Records that `userId` likes `announcementId` (a repeat like is a no-op)
 * and returns the announcement with its updated likeCount/isLikedByMe.
 * Returns null if the announcement doesn't exist.
 */
async function likeAnnouncement(announcementId, userId) {
    try {
        await (0, announcements_1.dbLikeAnnouncement)(announcementId, userId);
        return await (0, announcements_1.dbGetAnnouncementById)(announcementId, userId);
    }
    catch (error) {
        console.error('Like announcement error:', error);
        return null;
    }
}
/**
 * Removes `userId`'s like from `announcementId` (a no-op if they hadn't
 * liked it) and returns the announcement with its updated
 * likeCount/isLikedByMe. Returns null if the announcement doesn't exist.
 */
async function unlikeAnnouncement(announcementId, userId) {
    try {
        await (0, announcements_1.dbUnlikeAnnouncement)(announcementId, userId);
        return await (0, announcements_1.dbGetAnnouncementById)(announcementId, userId);
    }
    catch (error) {
        console.error('Unlike announcement error:', error);
        return null;
    }
}
/**
 * Fetches every comment on an announcement, oldest first.
 */
async function getComments(announcementId) {
    try {
        return await (0, announcements_1.dbGetCommentsForAnnouncement)(announcementId);
    }
    catch (error) {
        console.error('Get comments error:', error);
        return [];
    }
}
/**
 * Adds a comment to an announcement, then (best-effort) notifies anyone
 * @mentioned in it — a comment doesn't re-broadcast to every member the way
 * a new announcement does, only whoever was actually tagged.
 * Returns the created comment, or null if the announcement doesn't exist.
 */
async function addComment(announcementId, authorId, content) {
    try {
        const comment = await (0, announcements_1.dbCreateComment)(announcementId, authorId, content);
        if (!comment)
            return null;
        void notifyOnComment(comment, authorId);
        return comment;
    }
    catch (error) {
        console.error('Add comment error:', error);
        return null;
    }
}
async function notifyOnComment(comment, authorId) {
    try {
        const mentionedIds = await (0, mentions_1.extractMentionedUserIds)(comment.content, authorId);
        if (mentionedIds.length === 0)
            return;
        const commenterName = comment.authorName ?? 'Someone';
        const excerpt = comment.content.length > 140 ? `${comment.content.slice(0, 140)}…` : comment.content;
        await (0, notifications_1.createNotificationsBulk)(mentionedIds.map((userId) => ({
            userId,
            type: 'alert',
            title: `${commenterName} tagged you in a comment`,
            message: excerpt,
        })));
    }
    catch (error) {
        console.error('Notify on comment error:', error);
    }
}
/**
 * Deletes a comment by its ID.
 * Returns true if the comment was deleted, or false if no comment exists
 * with the given ID.
 */
async function deleteComment(commentId) {
    try {
        return await (0, announcements_1.dbDeleteComment)(commentId);
    }
    catch (error) {
        console.error('Delete comment error:', error);
        return false;
    }
}
/**
 * Looks up who authored a comment — used by the route layer to check
 * "author or admin" before allowing a delete.
 */
async function getCommentAuthorId(commentId) {
    return (0, announcements_1.dbGetCommentAuthorId)(commentId);
}
//# sourceMappingURL=announcements.js.map