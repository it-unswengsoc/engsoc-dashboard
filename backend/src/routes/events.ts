import { Router, type Response } from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventImage,
  validateEventImage,
  validateEventCoordinates,
} from '../functions/events';
import { getStaticMap } from '../functions/places';
import { decodeImageDataUri } from '../functions/announcement-images';
import { isUserAdmin } from '../functions/admin';
import { setRsvp, getRsvpSummary } from '../functions/rsvp';
import { verifyAuthToken, requireRole, type AuthedRequest } from '../middleware/auth';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler, created, ok, parseId } from '../lib/http';

const router = Router();

/* Only the organizer or an admin can edit/delete an official event — PUT and
   DELETE had no check at all before this, so any logged-in member could edit
   or delete any event. Mirrors announcements.ts's canModify. Throws 404/403,
   or returns the event. */
async function getModifiableEvent(eventId: number, userId: number, action: 'edit' | 'delete') {
  const event = await getEventById(eventId);
  if (!event) throw new NotFoundError('Event not found');
  if (event.organizerId !== userId && !(await isUserAdmin(userId))) {
    throw new ForbiddenError(`Only the organizer or an admin can ${action} this event`);
  }
  return event;
}

/* Images and maps are linked from other origins' <img> tags, so they need
   CORP relaxed (helmet defaults it to same-origin). */
function sendImage(res: Response, body: Buffer, contentType: string, cacheControl: string) {
  res.set({
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  res.status(200).send(body);
}

/**
 * GET /events
 * Retrieves all events.
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    ok(res, await getAllEvents());
  }),
);

/**
 * GET /events/:eventId/image?v=...
 * Serves an event's photo as a real image response, so event lists link to
 * it instead of inlining it. Public, like the event list itself.
 */
router.get(
  '/:eventId/image',
  asyncHandler(async (req, res) => {
    const dataUri = await getEventImage(parseId(req.params.eventId, 'event'));
    const image = dataUri ? decodeImageDataUri(dataUri) : null;
    if (!image) throw new NotFoundError('Image not found');

    // The URL changes whenever the event does (v = updated_at).
    sendImage(res, image.body, image.contentType, 'public, max-age=31536000, immutable');
  }),
);

/**
 * GET /events/:eventId/map?v=lat,lng
 * The event's location as a map image, drawn by Google Static Maps with the
 * backend's key. Public, like the event itself.
 */
router.get(
  '/:eventId/map',
  asyncHandler(async (req, res) => {
    const event = await getEventById(parseId(req.params.eventId, 'event'));
    if (!event || event.locationLat === null || event.locationLng === null) {
      throw new NotFoundError('Map not found');
    }

    // The URL changes whenever the coordinates do (v = lat,lng).
    const image = await getStaticMap(event.locationLat, event.locationLng);
    sendImage(res, image, 'image/png', 'public, max-age=604800');
  }),
);

/**
 * GET /events/:eventId
 * Retrieves a specific event by ID.
 */
router.get(
  '/:eventId',
  asyncHandler(async (req, res) => {
    const event = await getEventById(parseId(req.params.eventId, 'event'));
    if (!event) throw new NotFoundError('Event not found');
    ok(res, event);
  }),
);

/**
 * POST /events
 * Creates a new event. Director, executive or admin only.
 */
router.post(
  '/',
  verifyAuthToken,
  requireRole(['director', 'executive', 'admin']),
  asyncHandler(async (req: AuthedRequest, res) => {
    const {
      title,
      description,
      imageUrl,
      eventType,
      startDate,
      endDate,
      location,
      locationLat,
      locationLng,
      capacity,
      facebookUrl,
      instagramUrl,
    } = req.body;

    if (!title || !startDate) throw new ValidationError('Missing required fields: title, startDate');

    // createEvent throws a ValidationError for invalid input; a DB or
    // Google Calendar failure resolves to null instead.
    const event = await createEvent({
      title,
      description,
      imageUrl,
      eventType,
      startDate,
      endDate,
      location,
      locationLat,
      locationLng,
      organizerId: req.user.userId,
      capacity,
      facebookUrl,
      instagramUrl,
    });
    if (!event) throw new ValidationError('Failed to create event');

    created(res, event, { message: 'Event created successfully' });
  }),
);

/**
 * PUT /events/:eventId
 * Edits the details of an event. Organizer or admin only.
 */
router.put(
  '/:eventId',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const eventId = parseId(req.params.eventId, 'event');
    await getModifiableEvent(eventId, req.user.userId, 'edit');

    const {
      title,
      description,
      imageUrl,
      eventType,
      startDate,
      endDate,
      location,
      locationLat,
      locationLng,
      status,
      capacity,
      facebookUrl,
      instagramUrl,
    } = req.body;

    validateEventImage(imageUrl);
    validateEventCoordinates(locationLat, locationLng);

    const event = await updateEvent(eventId, {
      title,
      description,
      imageUrl,
      eventType,
      startDate,
      endDate,
      location,
      locationLat,
      locationLng,
      status,
      capacity,
      facebookUrl,
      instagramUrl,
    });
    if (!event) throw new NotFoundError('Event not found');

    ok(res, event, { message: 'Event updated successfully' });
  }),
);

/**
 * DELETE /events/:eventId
 * Deletes an event. Organizer or admin only.
 */
router.delete(
  '/:eventId',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const eventId = parseId(req.params.eventId, 'event');
    await getModifiableEvent(eventId, req.user.userId, 'delete');

    if (!(await deleteEvent(eventId))) throw new NotFoundError('Event not found');

    ok(res, undefined, { message: 'Event deleted successfully' });
  }),
);

/**
 * GET /events/:eventId/rsvp
 * Who's going / not going, plus the signed-in member's own status.
 */
router.get(
  '/:eventId/rsvp',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    ok(res, await getRsvpSummary(parseId(req.params.eventId, 'event'), req.user.userId));
  }),
);

/**
 * PUT /events/:eventId/rsvp
 * Records the signed-in member's own RSVP — any member can RSVP to any
 * event (there's no invite list; see the comment on the events table).
 */
router.put(
  '/:eventId/rsvp',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const eventId = parseId(req.params.eventId, 'event');
    await setRsvp(eventId, req.user.userId, req.body.status);
    ok(res, await getRsvpSummary(eventId, req.user.userId));
  }, 'Failed to update RSVP'),
);

export default router;
