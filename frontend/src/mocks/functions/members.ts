import type { Member } from '@/types/requests';
import { mockCurrentUser, mockMembers } from '@/mocks/data/members';

export async function getMembers(): Promise<Member[]> {
  return mockMembers;
}

export async function getCurrentUser(): Promise<Member> {
  return mockCurrentUser;
}
