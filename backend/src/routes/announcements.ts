import { Router } from 'express';
import {
  getAllAnnouncements,
  getAnnouncementImage,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  likeAnnouncement,
  unlikeAnnouncement,
  getComments,
  addComment,
  deleteComment,
  getAnnouncementAuthorId,
  getCommentAuthorId,
} from '../functions/announcements';
import { isUserAdmin } from '../functions/admin';
import { decodeImageDataUri, isValidAnnouncementImageSignature } from '../functions/announcement-images';
import { verifyAuthToken, requireRole, type AuthedRequest } from '../middleware/auth';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler, created, ok, parseId } from '../lib/http';

const router = Router();

/* Only the author or an admin can edit/delete their own announcement/comment
   — anyone with a valid token could delete before this (POST already needed
   director/executive/admin, but delete had no check at all). authorId is
   null when the announcement/comment doesn't exist. */
async function assertCanModify(userId: number, authorId: number | null, what: string, action: 'edit' | 'delete') {
  if (authorId === null) throw new NotFoundError(`${what} not found`);
  if (authorId !== userId && !(await isUserAdmin(userId))) {
    throw new ForbiddenError(`Only the author or an admin can ${action} this`);
  }
}

/**
 * GET /announcements
 * Retrieves all announcements. Requires authentication because
 * isLikedByMe is computed per requesting user.
 */
router.get(
  '/',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await getAllAnnouncements(req.user.userId));
  }),
);

/**
 * GET /announcements/:announcementId/image?v=...&sig=...
 * Serves an announcement's image as a real image response, so list
 * responses can link to it instead of inlining it. No verifyAuthToken — an
 * <img> can't send one — so access is by the signed URL that only an
 * authenticated list/create/update response hands out (see
 * functions/announcement-images.ts).
 */
router.get(
  '/:announcementId/image',
  asyncHandler(async (req, res) => {
    const announcementId = parseInt(req.params.announcementId, 10);
    const { v, sig } = req.query;
    if (
      isNaN(announcementId) ||
      typeof v !== 'string' ||
      typeof sig !== 'string' ||
      !isValidAnnouncementImageSignature(announcementId, v, sig)
    ) {
      throw new ForbiddenError('Invalid image link');
    }

    const dataUri = await getAnnouncementImage(announcementId);
    const image = dataUri ? decodeImageDataUri(dataUri) : null;
    if (!image) throw new NotFoundError('Image not found');

    res.set({
      'Content-Type': image.contentType,
      // The URL changes whenever the image does (v = updated_at), so it's
      // safe to keep for good. private: never shared caches.
      'Cache-Control': 'private, max-age=31536000, immutable',
      // helmet defaults this to same-origin, which would stop the
      // frontend's own domain from displaying it.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.status(200).send(image.body);
  }),
);

/**
 * POST /announcements
 * Creates a new announcement authored by the requesting user. Director,
 * executive or admin only.
 */
router.post(
  '/',
  verifyAuthToken,
  requireRole(['director', 'executive', 'admin']),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { content, imageUrl } = req.body;

    // createAnnouncement throws a ValidationError for invalid input
    // (caption missing, image too large or not an image); a DB failure
    // resolves to null instead.
    const announcement = await createAnnouncement({ authorId: req.user.userId, content, imageUrl });
    if (!announcement) throw new ValidationError('Failed to create announcement');

    created(res, announcement, { message: 'Announcement created successfully' });
  }),
);

/**
 * PATCH /announcements/:announcementId
 * Edits an announcement's caption and/or image. Author or admin only. Body:
 * { content?, imageUrl? } — imageUrl: null clears an existing image.
 */
router.patch(
  '/:announcementId',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const announcementId = parseId(req.params.announcementId, 'announcement');
    const { content, imageUrl } = req.body as { content?: string; imageUrl?: string | null };

    await assertCanModify(req.user.userId, await getAnnouncementAuthorId(announcementId), 'Announcement', 'edit');

    const announcement = await updateAnnouncement(announcementId, { content, imageUrl }, req.user.userId);
    if (!announcement) throw new ValidationError('Failed to update announcement');

    ok(res, announcement, { message: 'Announcement updated' });
  }),
);

/**
 * DELETE /announcements/:announcementId
 * Deletes an announcement. Author or admin only.
 */
router.delete(
  '/:announcementId',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const announcementId = parseId(req.params.announcementId, 'announcement');
    await assertCanModify(req.user.userId, await getAnnouncementAuthorId(announcementId), 'Announcement', 'delete');

    if (!(await deleteAnnouncement(announcementId))) throw new NotFoundError('Announcement not found');

    ok(res, undefined, { message: 'Announcement deleted successfully' });
  }),
);

/**
 * POST /announcements/:announcementId/like
 * Likes an announcement on behalf of the requesting user.
 */
router.post(
  '/:announcementId/like',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const announcement = await likeAnnouncement(parseId(req.params.announcementId, 'announcement'), req.user.userId);
    if (!announcement) throw new NotFoundError('Announcement not found');
    ok(res, announcement, { message: 'Announcement liked' });
  }),
);

/**
 * DELETE /announcements/:announcementId/like
 * Removes the requesting user's like from an announcement.
 */
router.delete(
  '/:announcementId/like',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const announcement = await unlikeAnnouncement(parseId(req.params.announcementId, 'announcement'), req.user.userId);
    if (!announcement) throw new NotFoundError('Announcement not found');
    ok(res, announcement, { message: 'Announcement unliked' });
  }),
);

/**
 * GET /announcements/:announcementId/comments
 * Lists every comment on an announcement, oldest first.
 */
router.get(
  '/:announcementId/comments',
  verifyAuthToken,
  asyncHandler(async (req, res) => {
    ok(res, await getComments(parseId(req.params.announcementId, 'announcement')));
  }),
);

/**
 * POST /announcements/:announcementId/comments
 * Adds a comment, authored by the requesting user. Anyone signed in can
 * comment — only posting the announcement itself is director/exec/admin
 * only.
 */
router.post(
  '/:announcementId/comments',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const announcementId = parseId(req.params.announcementId, 'announcement');
    const { content } = req.body as { content?: string };
    if (!content?.trim()) throw new ValidationError('Missing required field: content');

    const comment = await addComment(announcementId, req.user.userId, content.trim());
    if (!comment) throw new NotFoundError('Announcement not found');

    created(res, comment, { message: 'Comment added' });
  }),
);

/**
 * DELETE /announcements/:announcementId/comments/:commentId
 * Deletes a comment. Author or admin only.
 */
router.delete(
  '/:announcementId/comments/:commentId',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const commentId = parseId(req.params.commentId, 'comment');
    await assertCanModify(req.user.userId, await getCommentAuthorId(commentId), 'Comment', 'delete');

    if (!(await deleteComment(commentId))) throw new NotFoundError('Comment not found');

    ok(res, undefined, { message: 'Comment deleted' });
  }),
);

export default router;
