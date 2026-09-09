export type EventType = 'INTERNAL' | 'EXTERNAL';

export interface EventItem {
  id: number;
  name: string;
  type: EventType;
  startsAt: string; // ISO date string
}
