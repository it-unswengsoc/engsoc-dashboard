import { Router, Request, Response } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../functions/events';
import { verifyAuthToken } from './auth';

const router = Router();

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
 * Creates a new event. Requires authentication.
 */
router.post('/', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, eventDate, location, capacity } = req.body;

    if (!title || !eventDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: title, eventDate',
      });
    }

    const event = await createEvent({
      title,
      description,
      eventDate,
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
    console.error('Create event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * PUT /api/event/:eventId
 * Edits the details of an event. Requires authentication.
 */
router.put('/:eventId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);

    if (isNaN(eventId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid event ID',
      });
    }

    const { title, description, eventDate, location, status, capacity } = req.body;

    const event = await updateEvent(eventId, {
      title,
      description,
      eventDate,
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
 * Deletes an event. Requires authentication.
 */
router.delete('/:eventId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);

    if (isNaN(eventId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid event ID',
      });
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
