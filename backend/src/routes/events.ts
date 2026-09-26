import { Router, Request, Response } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../functions/events';
import { verifyAuthToken, requireRole } from './auth';
import { isUserAdmin } from '../functions/admin';

const router = Router();

/* Only the organizer or an admin can edit/delete an official event — PUT and
   DELETE had no check at all before this, so any logged-in member could edit
   or delete any event. Mirrors announcements.ts's canModify. */
async function canModifyEvent(userId: number, organizerId: number | null): Promise<boolean> {
  if (organizerId === userId) return true;
  return isUserAdmin(userId);
}

/**
 * GET /api/event
 * Retrieves all events.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await getAllEvents();

    res.status(200).json({
      status: 'success',
      data: events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/event/:eventId
 * Retrieves a specific event by ID.
 */
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);

    if (isNaN(eventId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid event ID',
      });
    }

    const event = await getEventById(eventId);

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: event,
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/event
 * Creates a new event. Director, executive or admin only.
 */
router.post('/', verifyAuthToken, requireRole(['director', 'executive', 'admin']), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, imageUrl, eventType, startDate, endDate, location, capacity } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: title, startDate',
      });
    }

    const event = await createEvent({
      title,
      description,
      imageUrl,
      eventType,
      startDate,
      endDate,
      location,
      organizerId: user.userId,
      capacity,
    });

    if (!event) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to create event',
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Event created successfully',
      data: event,
    });
  } catch (error) {
    // createEvent only throws for invalid input (see functions/events.ts) —
    // a DB or Google Calendar failure resolves to null instead, handled above.
    console.error('Create event error:', error);
    res.status(400).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to create event',
    });
  }
});

/**
 * PUT /api/event/:eventId
 * Edits the details of an event. Organizer or admin only.
 */
router.put('/:eventId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const user = (req as any).user;

    if (isNaN(eventId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid event ID',
      });
    }

    const existing = await getEventById(eventId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }
    if (!(await canModifyEvent(user.userId, existing.organizerId))) {
      return res.status(403).json({ status: 'error', message: 'Only the organizer or an admin can edit this event' });
    }

    const { title, description, imageUrl, eventType, startDate, endDate, location, status, capacity } = req.body;

    const event = await updateEvent(eventId, {
      title,
      description,
      imageUrl,
      eventType,
      startDate,
      endDate,
      location,
      status,
      capacity,
    });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/event/:eventId
 * Deletes an event. Organizer or admin only.
 */
router.delete('/:eventId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const user = (req as any).user;

    if (isNaN(eventId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid event ID',
      });
    }

    const existing = await getEventById(eventId);
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }
    if (!(await canModifyEvent(user.userId, existing.organizerId))) {
      return res.status(403).json({ status: 'error', message: 'Only the organizer or an admin can delete this event' });
    }

    const deleted = await deleteEvent(eventId);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

export default router;
