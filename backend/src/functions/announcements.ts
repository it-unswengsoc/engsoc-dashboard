import {
  dbGetAllAnnouncements,
  dbGetAnnouncementById,
  dbCreateAnnouncement,
  dbDeleteAnnouncement,
  dbLikeAnnouncement,
  dbUnlikeAnnouncement,
} from '../database/announcements';

export type AuthorRole = 'member' | 'director' | 'executive' | 'admin';

export interface Announcement {
  id: number;
  authorId: number | null;
  authorName: string | null;
  authorRole: AuthorRole | null;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  isLikedByMe: boolean;
  commentCount: number;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  authorId: number;
  content: string;
  imageUrl?: string;
}

/**
 * Retrieves all announcements, newest first, with isLikedByMe computed for
 * the requesting user. Returns an empty array if none exist.
 */
export async function getAllAnnouncements(currentUserId: number): Promise<Announcement[]> {
  try {
    return await dbGetAllAnnouncements(currentUserId);
  } catch (error) {
    console.error('Get all announcements error:', error);
    return [];
  }
}

/**
 * Creates a new announcement authored by the given user.
 * Returns the newly created announcement, or null if creation failed.
 */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement | null> {
  try {
    return await dbCreateAnnouncement(input);
  } catch (error) {
    console.error('Create announcement error:', error);
    return null;
  }
}

/**
 * Deletes an announcement by its ID.
 * Returns true if the announcement was deleted, or false if no announcement
 * exists with the given ID.
 */
export async function deleteAnnouncement(announcementId: number): Promise<boolean> {
  try {
    return await dbDeleteAnnouncement(announcementId);
  } catch (error) {
    console.error('Delete announcement error:', error);
    return false;
  }
}

/**
 * Records that `userId` likes `announcementId` (a repeat like is a no-op)
 * and returns the announcement with its updated likeCount/isLikedByMe.
 * Returns null if the announcement doesn't exist.
 */
export async function likeAnnouncement(announcementId: number, userId: number): Promise<Announcement | null> {
  try {
    await dbLikeAnnouncement(announcementId, userId);
    return await dbGetAnnouncementById(announcementId, userId);
  } catch (error) {
    console.error('Like announcement error:', error);
    return null;
  }
}

/**
 * Removes `userId`'s like from `announcementId` (a no-op if they hadn't
 * liked it) and returns the announcement with its updated
 * likeCount/isLikedByMe. Returns null if the announcement doesn't exist.
 */
export async function unlikeAnnouncement(announcementId: number, userId: number): Promise<Announcement | null> {
  try {
    await dbUnlikeAnnouncement(announcementId, userId);
    return await dbGetAnnouncementById(announcementId, userId);
  } catch (error) {
    console.error('Unlike announcement error:', error);
    return null;
  }
}
