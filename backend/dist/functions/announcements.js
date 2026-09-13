"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAnnouncements = getAllAnnouncements;
exports.createAnnouncement = createAnnouncement;
exports.deleteAnnouncement = deleteAnnouncement;
exports.likeAnnouncement = likeAnnouncement;
exports.unlikeAnnouncement = unlikeAnnouncement;
const announcements_1 = require("../database/announcements");
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
 * Creates a new announcement authored by the given user.
 * Returns the newly created announcement, or null if creation failed.
 */
async function createAnnouncement(input) {
    try {
        return await (0, announcements_1.dbCreateAnnouncement)(input);
    }
    catch (error) {
        console.error('Create announcement error:', error);
        return null;
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
//# sourceMappingURL=announcements.js.map