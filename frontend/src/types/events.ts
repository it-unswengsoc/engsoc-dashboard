export type EventType = 'INTERNAL' | 'EXTERNAL';

export interface EventItem {
  id: number;
  name: string;
  type: EventType;
  startsAt: string; // ISO date string
  endsAt: string | null; // ISO date string — null if the event has no set end time
  organizerId: number | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
}
