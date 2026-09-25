import type { Member } from '@/types/requests';
import { mockCurrentUser, mockMembers } from '@/mocks/data/members';

/* A copy, not the live mockMembers array — see
   mocks/functions/announcements.ts's getAnnouncements for why. */
export async function getMembers(): Promise<Member[]> {
  return mockMembers.slice();
}

export async function getCurrentUser(): Promise<Member> {
  return mockCurrentUser;
}
