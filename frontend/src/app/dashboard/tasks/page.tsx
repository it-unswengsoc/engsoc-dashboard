'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/services/auth-api';
import { getBoardTasks } from '@/services/tasks-api';
import TasksBoard from '@/components/tasks/TasksBoard';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';
import type { Profile } from '@/types/auth';
import type { BoardTask } from '@/types/tasks';

/* Client-side, not server-rendered: the board is scoped to the viewer's port
   and GET /tasks?port=… needs the JWT held in sessionStorage — same pattern
   as the dashboard home page. */
export default function TasksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<BoardTask[]>([]);

  const load = useCallback(async (token: string) => {
    const me = await getProfile(token);
    setProfile(me);
    setTasks(me.port ? await getBoardTasks(token, me.port) : []);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    load(token)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [router, load]);

  // Re-fetch after a task is created from the header's "New" dialog.
  useEffect(() => {
    function handleChanged() {
      const token = sessionStorage.getItem('token');
      if (token) load(token).catch(() => {});
    }
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, handleChanged);
  }, [load]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-[#8B2E38]">{error}</p>;
  if (!profile) return null;

  if (!profile.port) {
    return (
      <p className="text-sm text-gray-500">
        You haven&apos;t been given a port yet, so there&apos;s no board to show. An admin can set it in the
        admin panel.
      </p>
    );
  }

  return <TasksBoard tasks={tasks} currentUserId={profile.id} port={profile.port} />;
}
