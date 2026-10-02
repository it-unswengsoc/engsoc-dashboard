import { Router, Request, Response } from 'express';
import { autocompletePlaces, getPlaceDetails, PlacesError } from '../functions/places';
import { verifyAuthToken } from './auth';

const router = Router();

/**
 * GET /places/autocomplete?q=…&session=…
 * Place suggestions for an event's location as it's typed.
 */
router.get('/autocomplete', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const session = typeof req.query.session === 'string' ? req.query.session : undefined;
    if (q.length < 2) return res.status(200).json({ status: 'success', data: [] });
    if (q.length > 200) return res.status(400).json({ status: 'error', message: 'Search is too long' });

    const suggestions = await autocompletePlaces(q, session);
    res.status(200).json({ status: 'success', data: suggestions });
  } catch (error) {
    if (error instanceof PlacesError) return res.status(502).json({ status: 'error', message: error.message });
    console.error('Place autocomplete error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

/**
 * GET /places/:placeId?session=…
 * A picked suggestion's name, address and coordinates.
 */
router.get('/:placeId', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const session = typeof req.query.session === 'string' ? req.query.session : undefined;
    const place = await getPlaceDetails(req.params.placeId, session);
    res.status(200).json({ status: 'success', data: place });
  } catch (error) {
    if (error instanceof PlacesError) return res.status(502).json({ status: 'error', message: error.message });
    console.error('Place details error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
