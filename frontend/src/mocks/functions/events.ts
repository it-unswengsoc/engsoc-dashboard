import type { EventItem } from '@/types/events';
import type { CreateEventInput, UpdateEventInput } from '@/services/events-api';
import { mockEvents } from '@/mocks/data/events';
import { mockProfile } from '@/mocks/data/auth';

/* A copy, not the live mockEvents array — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getEvents(): Promise<EventItem[]> {
  return mockEvents.slice();
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
  return event;
}

export async function deleteEvent(eventId: number): Promise<void> {
  const index = mockEvents.findIndex((e) => e.id === eventId);
  if (index === -1) throw new Error('Event not found');
  mockEvents.splice(index, 1);
}
