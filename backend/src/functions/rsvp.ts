import { dbSetRsvp, dbGetRsvpEntries, type RsvpStatus, type RsvpEntry } from '../database/rsvp';

export type { RsvpStatus, RsvpEntry };

export interface RsvpSummary {
  going: RsvpEntry[];
  notGoing: RsvpEntry[];
  myStatus: RsvpStatus | null;
}

export async function setRsvp(eventId: number, userId: number, status: string): Promise<void> {
  if (status !== 'going' && status !== 'not_going') {
    throw new Error("Status must be 'going' or 'not_going'");
  }
  await dbSetRsvp(eventId, userId, status);
}

export async function getRsvpSummary(eventId: number, viewerId: number): Promise<RsvpSummary> {
  const entries = await dbGetRsvpEntries(eventId);
  return {
    going: entries.filter((e) => e.status === 'going'),
    notGoing: entries.filter((e) => e.status === 'not_going'),
    myStatus: entries.find((e) => e.userId === viewerId)?.status ?? null,
  };
}
