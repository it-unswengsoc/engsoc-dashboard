import { Router, Request, Response } from 'express';
import {
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  likeAnnouncement,
  unlikeAnnouncement,
} from '../functions/announcements';
import { verifyAuthToken } from './auth';

const router = Router();

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
 * Creates a new announcement authored by the requesting user.
 */
router.post('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { content, imageUrl } = req.body;

    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required field: content',
      });
    }

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
router.delete('/:announcementId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const announcementId = parseInt(req.params.announcementId);

    if (isNaN(announcementId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid announcement ID',
      });
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

export default router;
