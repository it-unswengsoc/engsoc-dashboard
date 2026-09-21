import type { Member, RequestDetail } from '@/types/requests';

export type { Member, RequestDetail };

/* Always mock, regardless of NEXT_PUBLIC_USE_MOCK — the requests table exists
   (see database/create-tables.sql) but no /requests route is mounted, and
   nothing submits a request yet, so a real fetch would 404.

   Once the route lands this takes the viewer's port and filters on
   target_port: GET /requests?targetPort=... — the page can't do that today
   because getProfile doesn't return users.port. */
export async function getRequests(): Promise<RequestDetail[]> {
  const { getRequests: mockGetRequests } = await import('@/mocks/functions/requests');
  return mockGetRequests();
}

/* Who the assignee picker can choose from. Becomes GET /users?port=… once
   such an endpoint exists — users.port is in the schema, nothing serves it. */
export async function getMembers(): Promise<Member[]> {
  const { getMembers: mockGetMembers } = await import('@/mocks/functions/members');
  return mockGetMembers();
}

/* Who's signed in — needed to split "my port's queue" from "what I submitted".
   getProfile covers most of this already, but omits users.port. */
export async function getCurrentUser(): Promise<Member> {
  const { getCurrentUser: mockGetCurrentUser } = await import('@/mocks/functions/members');
  return mockGetCurrentUser();
}
