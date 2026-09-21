import { getCurrentUser, getMembers, getRequests } from '@/services/requests-api';
import RequestsView from '@/components/requests/RequestsView';

/* TODO: read the viewer's port instead. users.port exists, but getProfile
   doesn't return it, so there's nothing to filter target_port against yet. */
const VIEWER_PORT = 'publication';

export default async function RequestsPage() {
  const [requests, members, currentUser] = await Promise.all([
    getRequests(),
    getMembers(),
    getCurrentUser(),
  ]);

  return (
    <RequestsView
      requests={requests}
      members={members}
      currentUser={currentUser}
      port={VIEWER_PORT}
    />
  );
}
