import { USE_MOCK } from '@/services/api-config';
import { api } from '@/services/api-client';

/* Location search for events, through the backend (which holds the Google
   key — see backend/src/functions/places.ts). */
export interface PlaceSuggestion {
  placeId: string;
  name: string; // "UNSW Roundhouse"
  detail: string; // "Anzac Parade, Kensington NSW, Australia"
}

export interface PlaceDetails {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

/* `session` groups one search's keystrokes with the pick that ends it, so
   Google bills them as one. */
export async function searchPlaces(token: string, query: string, session: string): Promise<PlaceSuggestion[]> {
  if (USE_MOCK) {
    const { searchPlaces: mockSearchPlaces } = await import('@/mocks/functions/places');
    return mockSearchPlaces(query);
  }

  const params = new URLSearchParams({ q: query, session });
  return api<PlaceSuggestion[]>(`/places/autocomplete?${params}`, { token, errorMessage: 'Location search failed' });
}

export async function getPlace(token: string, placeId: string, session: string): Promise<PlaceDetails> {
  if (USE_MOCK) {
    const { getPlace: mockGetPlace } = await import('@/mocks/functions/places');
    return mockGetPlace(placeId);
  }

  return api<PlaceDetails>(`/places/${encodeURIComponent(placeId)}?session=${encodeURIComponent(session)}`, {
    token,
    errorMessage: 'Failed to load that place',
  });
}
