import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

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
  const res = await fetch(apiUrl(`/places/autocomplete?${params}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Location search failed');
  return data.data as PlaceSuggestion[];
}

export async function getPlace(token: string, placeId: string, session: string): Promise<PlaceDetails> {
  if (USE_MOCK) {
    const { getPlace: mockGetPlace } = await import('@/mocks/functions/places');
    return mockGetPlace(placeId);
  }

  const res = await fetch(apiUrl(`/places/${encodeURIComponent(placeId)}?session=${encodeURIComponent(session)}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load that place');
  return data.data as PlaceDetails;
}
