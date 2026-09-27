'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  /* Only the most recent load gets to set state — two re-fetches close
     together can finish out of order, and the older one would show stale
     rows. */
  const latestLoad = useRef(0);

  const load = useCallback(async (token: string) => {
    const loadId = ++latestLoad.current;
    const me = await getProfile(token);
    const board = me.port ? await getBoardTasks(token, me.port) : [];
    if (loadId !== latestLoad.current) return;
    setProfile(me);
    setTasks(board);
  }, []);

  const reload = useCallback(() => {
    const token = sessionStorage.getItem('token');
    if (token) load(token).catch(() => {});
  }, [load]);

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
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, reload);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, reload);
  }, [reload]);

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

  return <TasksBoard tasks={tasks} currentUserId={profile.id} port={profile.port} onMoved={reload} />;
}
