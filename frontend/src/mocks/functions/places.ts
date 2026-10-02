import type { PlaceDetails, PlaceSuggestion } from '@/services/places-api';

type MockPlace = PlaceDetails & { name: string };

const MOCK_PLACES: MockPlace[] = [
  { placeId: 'mock-roundhouse', name: 'UNSW Roundhouse', address: 'Anzac Parade, Kensington NSW 2033, Australia', lat: -33.9165, lng: 151.2272 },
  { placeId: 'mock-library', name: 'UNSW Main Library', address: 'Library Rd, Kensington NSW 2033, Australia', lat: -33.9174, lng: 151.2331 },
  { placeId: 'mock-ainsworth', name: 'Ainsworth Building (J17)', address: 'Engineering Rd, Kensington NSW 2033, Australia', lat: -33.9182, lng: 151.2311 },
  { placeId: 'mock-coogee', name: 'Coogee Beach', address: 'Coogee NSW 2034, Australia', lat: -33.9206, lng: 151.2581 },
];

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const q = query.toLowerCase();
  return MOCK_PLACES.filter((p) => `${p.name} ${p.address}`.toLowerCase().includes(q)).map((p) => ({
    placeId: p.placeId,
    name: p.name,
    detail: p.address,
  }));
}

export async function getPlace(placeId: string): Promise<PlaceDetails> {
  const place = MOCK_PLACES.find((p) => p.placeId === placeId);
  if (!place) throw new Error('Place not found');
  return { placeId: place.placeId, address: place.address, lat: place.lat, lng: place.lng };
}
