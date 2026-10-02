import type { EventItem } from '@/types/events';
import type { CreateEventInput, UpdateEventInput, RsvpStatus, RsvpSummary } from '@/services/events-api';
import { mockEvents } from '@/mocks/data/events';
import { mockProfile } from '@/mocks/data/auth';

/* Keyed by event id — mirrors event_attendees, scoped to the one signed-in
   mock member (there's no other "user" to RSVP as in mock mode). */
const mockRsvps: Record<number, RsvpStatus> = {};

/* A copy, not the live mockEvents array — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getEvents(): Promise<EventItem[]> {
  return mockEvents.slice();
}

/* No Google key in mock mode — a placeholder stands in for the map. */
function mockMapUrl(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (lat == null || lng == null) return null;
  return `https://placehold.co/1280x560/E5ECF2/3D6C94?text=Map+${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function mockId(): number {
  return Math.max(0, ...mockEvents.map((e) => e.id)) + 1;
}

export async function createEvent(input: CreateEventInput): Promise<EventItem> {
  const event: EventItem = {
    id: mockId(),
    name: input.title,
    type: input.eventType.toUpperCase() as EventItem['type'],
    startsAt: input.startDate,
    endsAt: input.endDate ?? null,
    organizerId: mockProfile.id,
    location: input.location ?? null,
    description: input.description ?? null,
    capacity: input.capacity ?? null,
    facebookUrl: input.facebookUrl ?? null,
    instagramUrl: input.instagramUrl ?? null,
    imageUrl: input.imageUrl ?? null,
    locationLat: input.locationLat ?? null,
    locationLng: input.locationLng ?? null,
    mapUrl: mockMapUrl(input.locationLat, input.locationLng),
  };
  mockEvents.unshift(event);
  return event;
}

export async function updateEvent(eventId: number, input: UpdateEventInput): Promise<EventItem> {
  const event = mockEvents.find((e) => e.id === eventId);
  if (!event) throw new Error('Event not found');
  if (input.title !== undefined) event.name = input.title;
  if (input.eventType !== undefined) event.type = input.eventType.toUpperCase() as EventItem['type'];
  if (input.startDate !== undefined) event.startsAt = input.startDate;
  if (input.endDate !== undefined) event.endsAt = input.endDate ?? null;
  if (input.location !== undefined) event.location = input.location ?? null;
  if (input.description !== undefined) event.description = input.description ?? null;
  if (input.capacity !== undefined) event.capacity = input.capacity ?? null;
  if (input.facebookUrl !== undefined) event.facebookUrl = input.facebookUrl ?? null;
  if (input.instagramUrl !== undefined) event.instagramUrl = input.instagramUrl ?? null;
  if (input.imageUrl !== undefined) event.imageUrl = input.imageUrl;
  if (input.locationLat !== undefined) event.locationLat = input.locationLat;
  if (input.locationLng !== undefined) event.locationLng = input.locationLng;
  event.mapUrl = mockMapUrl(event.locationLat, event.locationLng);
  return event;
}

export async function deleteEvent(eventId: number): Promise<void> {
  const index = mockEvents.findIndex((e) => e.id === eventId);
  if (index === -1) throw new Error('Event not found');
  mockEvents.splice(index, 1);
}

function buildRsvpSummary(eventId: number): RsvpSummary {
  const myStatus = mockRsvps[eventId] ?? null;
  const name = `${mockProfile.firstName} ${mockProfile.lastName}`;
  return {
    going: myStatus === 'going' ? [{ userId: mockProfile.id, name, status: 'going' }] : [],
    notGoing: myStatus === 'not_going' ? [{ userId: mockProfile.id, name, status: 'not_going' }] : [],
    myStatus,
  };
}

export async function getRsvpSummary(eventId: number): Promise<RsvpSummary> {
  return buildRsvpSummary(eventId);
}

export async function setRsvp(eventId: number, status: RsvpStatus): Promise<RsvpSummary> {
  mockRsvps[eventId] = status;
  return buildRsvpSummary(eventId);
}
