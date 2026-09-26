import type { UserCalendarEvent, PersonalEventInput } from '@/services/user-calendar-api';
import { mockPersonalEvents } from '@/mocks/data/user-calendar';

/* A copy, not the live array — see mocks/functions/announcements.ts's
   getAnnouncements for why. */
export async function getPersonalEvents(): Promise<UserCalendarEvent[]> {
  return mockPersonalEvents.slice();
}

function mockGoogleEventId(): string {
  return `mock-personal-${Date.now()}`;
}

export async function createPersonalEvent(input: PersonalEventInput): Promise<UserCalendarEvent> {
  const event: UserCalendarEvent = {
    id: mockGoogleEventId(),
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: input.allDay,
    calendarName: 'Personal',
    isSharedEngSocEvent: false,
    htmlLink: null,
    canEdit: true,
    officialEventId: null,
  };
  mockPersonalEvents.unshift(event);
  return event;
}

export async function updatePersonalEvent(
  googleEventId: string,
  input: Partial<PersonalEventInput>
): Promise<UserCalendarEvent> {
  const event = mockPersonalEvents.find((e) => e.id === googleEventId);
  if (!event) throw new Error('Event not found');
  if (input.title !== undefined) event.title = input.title;
  if (input.description !== undefined) event.description = input.description ?? null;
  if (input.location !== undefined) event.location = input.location ?? null;
  if (input.startsAt !== undefined) event.startsAt = input.startsAt;
  if (input.endsAt !== undefined) event.endsAt = input.endsAt;
  if (input.allDay !== undefined) event.allDay = input.allDay;
  return event;
}

export async function deletePersonalEvent(googleEventId: string): Promise<void> {
  const index = mockPersonalEvents.findIndex((e) => e.id === googleEventId);
  if (index === -1) throw new Error('Event not found');
  mockPersonalEvents.splice(index, 1);
}
