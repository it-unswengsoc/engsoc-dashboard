import { Router, Request, Response } from 'express';
import {
  getAllAnnouncements,
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
import { verifyAuthToken, requireRole } from './auth';
import { isUserAdmin } from '../functions/admin';

const router = Router();

/* Only the author or an admin can edit/delete their own announcement/comment
   — anyone with a valid token could delete before this (POST already needed
   director/executive/admin, but delete had no check at all). */
async function canModify(userId: number, authorId: number | null): Promise<boolean> {
  if (authorId === userId) return true;
  return isUserAdmin(userId);
}

/**
 * GET /announcements
 * Retrieves all announcements. Requires authentication because
 * isLikedByMe is computed per requesting user.
 */
router.get('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const announcements = await getAllAnnouncements(user.userId);

    res.status(200).json({
      status: 'success',
      data: announcements,
    });
  } catch (error) {
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
router.post('/', verifyAuthToken, requireRole(['director', 'executive', 'admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { content, imageUrl } = req.body;

    const announcement = await createAnnouncement({
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
  } catch (error) {
    // createAnnouncement only throws for invalid input (caption missing,
    // image too large or not an image) — a DB failure resolves to null
    // instead, handled above. Same pattern as events.ts's createEvent.
    console.error('Create announcement error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create announcement',
    });
  }
});

/**
 * PATCH /announcements/:announcementId
 * Edits an announcement's caption and/or image. Author or admin only. Body:
 * { content?, imageUrl? } — imageUrl: null clears an existing image.
 */
router.patch('/:announcementId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.announcementId);
    const user = (req as any).user;
    const { content, imageUrl } = req.body as { content?: string; imageUrl?: string | null };

    if (isNaN(announcementId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid announcement ID' });
    }

    const authorId = await getAnnouncementAuthorId(announcementId);
    if (authorId === null) {
      return res.status(404).json({ status: 'error', message: 'Announcement not found' });
    }
    if (!(await canModify(user.userId, authorId))) {
      return res.status(403).json({ status: 'error', message: 'Only the author or an admin can edit this' });
    }

    const announcement = await updateAnnouncement(announcementId, { content, imageUrl }, user.userId);
    if (!announcement) {
      return res.status(400).json({ status: 'error', message: 'Failed to update announcement' });
    }

    res.status(200).json({ status: 'success', message: 'Announcement updated', data: announcement });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update announcement',
    });
  }
});

/**
 * DELETE /announcements/:announcementId
 * Deletes an announcement. Author or admin only.
 */
router.delete('/:announcementId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.announcementId);
    const user = (req as any).user;

    if (isNaN(announcementId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid announcement ID',
      });
    }

    const authorId = await getAnnouncementAuthorId(announcementId);
    if (authorId === null) {
      return res.status(404).json({ status: 'error', message: 'Announcement not found' });
    }
    if (!(await canModify(user.userId, authorId))) {
      return res.status(403).json({ status: 'error', message: 'Only the author or an admin can delete this' });
    }

    const deleted = await deleteAnnouncement(announcementId);

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
  } catch (error) {
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
router.post('/:announcementId/like', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.announcementId);
    const user = (req as any).user;

    if (isNaN(announcementId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid announcement ID',
      });
    }

    const announcement = await likeAnnouncement(announcementId, user.userId);

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
  } catch (error) {
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
router.delete('/:announcementId/like', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.announcementId);
    const user = (req as any).user;

    if (isNaN(announcementId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid announcement ID',
      });
    }

    const announcement = await unlikeAnnouncement(announcementId, user.userId);

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
  } catch (error) {
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
router.get('/:announcementId/comments', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.announcementId);
    if (isNaN(announcementId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid announcement ID' });
    }

    const comments = await getComments(announcementId);
    res.status(200).json({ status: 'success', data: comments });
  } catch (error) {
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
router.post('/:announcementId/comments', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.announcementId);
    const user = (req as any).user;
    const { content } = req.body as { content?: string };

    if (isNaN(announcementId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid announcement ID' });
    }
    if (!content?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Missing required field: content' });
    }

    const comment = await addComment(announcementId, user.userId, content.trim());
    if (!comment) {
      return res.status(404).json({ status: 'error', message: 'Announcement not found' });
    }

    res.status(201).json({ status: 'success', message: 'Comment added', data: comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * DELETE /announcements/:announcementId/comments/:commentId
 * Deletes a comment. Author or admin only.
 */
router.delete('/:announcementId/comments/:commentId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const user = (req as any).user;

    if (isNaN(commentId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid comment ID' });
    }

    const authorId = await getCommentAuthorId(commentId);
    if (authorId === null) {
      return res.status(404).json({ status: 'error', message: 'Comment not found' });
    }
    if (!(await canModify(user.userId, authorId))) {
      return res.status(403).json({ status: 'error', message: 'Only the author or an admin can delete this' });
    }

    const deleted = await deleteComment(commentId);
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Comment not found' });
    }

    res.status(200).json({ status: 'success', message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
