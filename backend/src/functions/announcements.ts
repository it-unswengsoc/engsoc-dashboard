import {
  dbGetAllAnnouncements,
  dbGetAnnouncementById,
  dbCreateAnnouncement,
  dbUpdateAnnouncement,
  dbDeleteAnnouncement,
  dbLikeAnnouncement,
  dbUnlikeAnnouncement,
  dbGetCommentsForAnnouncement,
  dbCreateComment,
  dbDeleteComment,
  dbGetAnnouncementAuthorId,
  dbGetCommentAuthorId,
} from '../database/announcements';
import { listDirectoryUsers } from './users';
import { extractMentionedUserIds } from './mentions';
import { createNotificationsBulk } from './notifications';

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

export interface UpdateAnnouncementInput {
  content?: string;
  imageUrl?: string | null;
}

// A data: URI inflates ~4/3 over the raw file, plus the JSON body it rides
// in — capped well under Vercel's serverless request body limit (see
// frontend/src/services/documents-api.ts's uploadDriveFile for why Drive
// uploads route around this entirely instead; announcements have no such
// route, so the cap lives here instead).
export const MAX_IMAGE_DATA_URI_LENGTH = 3_000_000;

export interface AnnouncementComment {
  id: number;
  announcementId: number;
  authorId: number | null;
  authorName: string | null;
  authorRole: AuthorRole | null;
  content: string;
  createdAt: string;
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
 * Creates a new announcement authored by the given user, then (best-effort,
 * never blocking the announcement itself):
 *   - notifies every other active member that a new announcement was posted
 *   - separately notifies anyone @mentioned in its content (by name or by
 *     portfolio — see functions/mentions.ts), even though they'll also get
 *     the broadcast above; it's a different notification (you were
 *     specifically tagged, not just "something new happened")
 * Returns the newly created announcement, or null if creation failed.
 */
function validateImageDataUri(imageUrl: string): void {
  if (!imageUrl.startsWith('data:image/')) {
    throw new Error('Image must be an uploaded image file');
  }
  if (imageUrl.length > MAX_IMAGE_DATA_URI_LENGTH) {
    throw new Error('Image is too large — please use one under 2MB');
  }
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement | null> {
  if (!input.content?.trim()) {
    throw new Error('Caption is required');
  }
  if (input.imageUrl) {
    validateImageDataUri(input.imageUrl);
  }

  try {
    const announcement = await dbCreateAnnouncement(input);
    if (!announcement) return null;

    void notifyOnAnnouncement(announcement, input.authorId);

    return announcement;
  } catch (error) {
    console.error('Create announcement error:', error);
    return null;
  }
}

/**
 * Edits an existing announcement's caption and/or image — author or admin
 * only (checked by the route). Doesn't re-run the new-announcement broadcast
 * or re-notify mentions: an edit is treated as a correction to what's
 * already out there, not a new thing happening, so it stays quiet.
 * Returns the updated announcement, or null if it doesn't exist.
 */
export async function updateAnnouncement(
  announcementId: number,
  input: UpdateAnnouncementInput,
  editorId: number
): Promise<Announcement | null> {
  if (input.content !== undefined && !input.content.trim()) {
    throw new Error('Caption is required');
  }
  if (input.imageUrl) {
    validateImageDataUri(input.imageUrl);
  }

  try {
    return await dbUpdateAnnouncement(announcementId, input, editorId);
  } catch (error) {
    console.error('Update announcement error:', error);
    return null;
  }
}

async function notifyOnAnnouncement(announcement: Announcement, authorId: number): Promise<void> {
  try {
    const posterName = announcement.authorName ?? 'Someone';
    const excerpt = announcement.content.length > 140 ? `${announcement.content.slice(0, 140)}…` : announcement.content;

    const directory = await listDirectoryUsers();
    const broadcastRecipients = directory.filter((u) => u.id !== authorId);

    // Excludes the author already (see extractMentionedUserIds) — everyone
    // left here gets both the broadcast above and this separate tag alert.
    const mentionedIds = await extractMentionedUserIds(announcement.content, authorId);

    await createNotificationsBulk([
      ...broadcastRecipients.map((u) => ({
        userId: u.id,
        type: 'announcement' as const,
        title: `New announcement from ${posterName}`,
        message: excerpt,
      })),
      ...mentionedIds.map((userId) => ({
        userId,
        type: 'alert' as const,
        title: `${posterName} tagged you in an announcement`,
        message: excerpt,
      })),
    ]);
  } catch (error) {
    console.error('Notify on announcement error:', error);
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
 * Looks up who authored an announcement — used by the route layer to check
 * "author or admin" before allowing a delete.
 */
export async function getAnnouncementAuthorId(announcementId: number): Promise<number | null> {
  return dbGetAnnouncementAuthorId(announcementId);
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

/**
 * Fetches every comment on an announcement, oldest first.
 */
export async function getComments(announcementId: number): Promise<AnnouncementComment[]> {
  try {
    return await dbGetCommentsForAnnouncement(announcementId);
  } catch (error) {
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
export async function addComment(
  announcementId: number,
  authorId: number,
  content: string
): Promise<AnnouncementComment | null> {
  try {
    const comment = await dbCreateComment(announcementId, authorId, content);
    if (!comment) return null;

    void notifyOnComment(comment, authorId);

    return comment;
  } catch (error) {
    console.error('Add comment error:', error);
    return null;
  }
}

async function notifyOnComment(comment: AnnouncementComment, authorId: number): Promise<void> {
  try {
    const mentionedIds = await extractMentionedUserIds(comment.content, authorId);
    if (mentionedIds.length === 0) return;

    const commenterName = comment.authorName ?? 'Someone';
    const excerpt = comment.content.length > 140 ? `${comment.content.slice(0, 140)}…` : comment.content;

    await createNotificationsBulk(
      mentionedIds.map((userId) => ({
        userId,
        type: 'alert' as const,
        title: `${commenterName} tagged you in a comment`,
        message: excerpt,
      }))
    );
  } catch (error) {
    console.error('Notify on comment error:', error);
  }
}

/**
 * Deletes a comment by its ID.
 * Returns true if the comment was deleted, or false if no comment exists
 * with the given ID.
 */
export async function deleteComment(commentId: number): Promise<boolean> {
  try {
    return await dbDeleteComment(commentId);
  } catch (error) {
    console.error('Delete comment error:', error);
    return false;
  }
}

/**
 * Looks up who authored a comment — used by the route layer to check
 * "author or admin" before allowing a delete.
 */
export async function getCommentAuthorId(commentId: number): Promise<number | null> {
  return dbGetCommentAuthorId(commentId);
}
