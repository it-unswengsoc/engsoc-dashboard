'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getRequests } from '@/services/requests-api';
import RequestsView, { RequestsViewSkeleton } from '@/components/requests/RequestsView';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';
import { useProfile } from '@/lib/profile-context';
import type { RequestsData } from '@/types/requests';

/* Client-side, not server-rendered: GET /requests is scoped to whoever's
   asking and needs the JWT held in sessionStorage — same pattern as the
   tasks board. Shows a skeleton until both the profile and the requests
   have arrived. */
export default function RequestsPage() {
  const { profile, failed: profileFailed } = useProfile();
  const [data, setData] = useState<RequestsData | null>(null);
  const [error, setError] = useState('');
  /* Only the most recent load gets to set anything — a refetch after a new
     request is submitted can overlap the first load. */
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    // The dashboard layout doesn't render its children without a token.
    const token = sessionStorage.getItem('token');
    if (!token) return;
    const loadId = ++latestLoad.current;
    try {
      const fresh = await getRequests(token);
      if (loadId !== latestLoad.current) return;
      setData(fresh);
      setError('');
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      // A failed refetch keeps what's already showing.
      setData((current) => {
        if (!current) setError(err instanceof Error ? err.message : 'Failed to load requests');
        return current;
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch after a request is submitted from the header's "New" dialog.
  useEffect(() => {
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, load);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, load);
  }, [load]);

  if (profileFailed) return <p className="text-sm text-[#8B2E38]">Failed to load requests</p>;
  if (error) return <p className="text-sm text-[#8B2E38]">{error}</p>;
  if (!profile || !data) return <RequestsViewSkeleton />;

  return <RequestsView data={data} currentUserId={profile.id} port={profile.port} />;
}
