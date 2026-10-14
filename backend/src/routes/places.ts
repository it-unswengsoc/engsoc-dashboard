import { Router } from 'express';
import { autocompletePlaces, getPlaceDetails } from '../functions/places';
import { verifyAuthToken } from '../middleware/auth';
import { ValidationError } from '../lib/errors';
import { asyncHandler, ok } from '../lib/http';

const router = Router();

router.use(verifyAuthToken);

/**
 * GET /places/autocomplete?q=…&session=…
 * Place suggestions for an event's location as it's typed.
 */
router.get(
  '/autocomplete',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const session = typeof req.query.session === 'string' ? req.query.session : undefined;
    if (q.length < 2) return ok(res, []);
    if (q.length > 200) throw new ValidationError('Search is too long');

    ok(res, await autocompletePlaces(q, session));
  }),
);

/**
 * GET /places/:placeId?session=…
 * A picked suggestion's name, address and coordinates.
 */
router.get(
  '/:placeId',
  asyncHandler(async (req, res) => {
    const session = typeof req.query.session === 'string' ? req.query.session : undefined;
    ok(res, await getPlaceDetails(req.params.placeId, session));
  }),
);

export default router;
