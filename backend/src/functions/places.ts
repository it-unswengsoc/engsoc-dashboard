/* Location search for events, through Google Places (New) and the Static
   Maps API. The browser never sees the API key: it asks the backend, which
   asks Google. Needs the Places API (New) and the Maps Static API enabled
   on GOOGLE_MAPS_API_KEY's project (or GOOGLE_API_KEY's, as a fallback). */

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';

/* Suggestions lean towards UNSW and Sydney, and stay in Australia. */
const LOCATION_BIAS = { circle: { center: { latitude: -33.9173, longitude: 151.2313 }, radius: 30000 } };

export interface PlaceSuggestion {
  placeId: string;
  name: string; // "UNSW Roundhouse"
  detail: string; // "Anzac Parade, Kensington NSW, Australia"
}

/* No name: the suggestion that was picked already has it, and asking
   Google for displayName moves the lookup up to a pricier tier. */
export interface PlaceDetails {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

/** Thrown when Google refuses or fails — the route answers 502. */
export class PlacesError extends Error {}

async function googleJson(url: string, init: RequestInit & { fieldMask?: string }): Promise<any> {
  if (!API_KEY) throw new PlacesError('Location search is not set up');
  const { fieldMask, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      ...(fieldMask ? { 'X-Goog-FieldMask': fieldMask } : {}),
      ...(headers as Record<string, string>),
    },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Google Places error:', res.status, data?.error?.message);
    throw new PlacesError('Location search is unavailable right now');
  }
  return data;
}

/* `sessionToken` groups one search's keystrokes with the pick that ends it,
   which Google bills as a single session. */
export async function autocompletePlaces(input: string, sessionToken?: string): Promise<PlaceSuggestion[]> {
  const data = await googleJson('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    body: JSON.stringify({
      input,
      sessionToken,
      locationBias: LOCATION_BIAS,
      includedRegionCodes: ['au'],
    }),
  });
  return (data.suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId,
      name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      detail: p.structuredFormat?.secondaryText?.text ?? '',
    }));
}

export async function getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
  const query = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  const data = await googleJson(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}${query}`, {
    method: 'GET',
    fieldMask: 'id,formattedAddress,location',
  });
  if (!data.location) throw new PlacesError('That place has no location');
  return {
    placeId: data.id,
    address: data.formattedAddress ?? '',
    lat: data.location.latitude,
    lng: data.location.longitude,
  };
}

/* A small map with a pin, as a PNG — for an event's details. */
export async function getStaticMap(lat: number, lng: number): Promise<Buffer> {
  if (!API_KEY) throw new PlacesError('Maps are not set up');
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '16',
    size: '640x280',
    scale: '2',
    markers: `color:0x3D6C94|${lat},${lng}`,
    key: API_KEY,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
  if (!res.ok) {
    console.error('Google Static Maps error:', res.status, await res.text().catch(() => ''));
    throw new PlacesError('Map is unavailable right now');
  }
  return Buffer.from(await res.arrayBuffer());
}
