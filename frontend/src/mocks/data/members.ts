import type { Member } from '@/types/requests';

/* Stand-in for GET /users?port=… — no such endpoint exists, so the assignee
   picker has nothing real to list. Scoped to the Publication port, matching
   the port the requests page currently views as. */
export const mockMembers: Member[] = [
  { id: 1, name: 'Admin', port: 'publication' },
  { id: 2, name: 'Zachary Abran', port: 'publication' },
  { id: 3, name: 'Lachlan Van', port: 'publication' },
  { id: 4, name: 'Won Lim', port: 'publication' },
  { id: 5, name: 'Nhan Huynh', port: 'publication' },
  { id: 6, name: 'Arif Li', port: 'publication' },
];

/* Whoever is signed in. Stands in for getProfile — which does exist, but
   doesn't return users.port, so it can't tell the page which queue to show. */
export const mockCurrentUser: Member = mockMembers[0];
