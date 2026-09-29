'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBoardTasks } from '@/services/tasks-api';
import TasksBoard, { TasksBoardSkeleton } from '@/components/tasks/TasksBoard';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';
import { useProfile } from '@/lib/profile-context';
import type { BoardTask } from '@/types/tasks';

/* Client-side, not server-rendered: the board is scoped to the viewer's port
   and GET /tasks?port=… needs the JWT held in sessionStorage — same pattern
   as the dashboard home page. The viewer's port comes from the dashboard
   shell's shared profile, so this page only fetches the board itself, and
   shows a skeleton board until it arrives. */
export default function TasksPage() {
  const { profile, failed: profileFailed } = useProfile();
  const port = profile?.port ?? null;

  const [tasks, setTasks] = useState<BoardTask[] | null>(null);
  const [error, setError] = useState('');
  /* Only the most recent load gets to set anything — rows or error. Two
     re-fetches close together can finish out of order, and an older one
     would otherwise show stale rows, or an error the newer one has already
     recovered from. */
  const latestLoad = useRef(0);
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    // The dashboard layout doesn't render its children without a token.
    const token = sessionStorage.getItem('token');
    if (!token || !port) return;

    const loadId = ++latestLoad.current;
    try {
      const board = await getBoardTasks(token, port);
      if (loadId !== latestLoad.current) return;
      hasLoaded.current = true;
      setTasks(board);
      setError('');
    } catch (err) {
      if (loadId !== latestLoad.current) return;
      // A failed re-fetch keeps the board that's already showing.
      if (!hasLoaded.current) setError(err instanceof Error ? err.message : 'Failed to load tasks');
    }
  }, [port]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch after a task is created from the header's "New" dialog.
  useEffect(() => {
    window.addEventListener(DASHBOARD_DATA_CHANGED_EVENT, load);
    return () => window.removeEventListener(DASHBOARD_DATA_CHANGED_EVENT, load);
  }, [load]);

  if (profileFailed) return <p className="text-sm text-[#8B2E38]">Failed to load tasks</p>;
  if (error) return <p className="text-sm text-[#8B2E38]">{error}</p>;

  if (profile && !profile.port) {
    return (
      <p className="text-sm text-gray-500">
        You haven&apos;t been given a port yet, so there&apos;s no board to show. An admin can set it in the
        admin panel.
      </p>
    );
  }

  if (!profile || !port || tasks === null) return <TasksBoardSkeleton port={port} />;

  return <TasksBoard tasks={tasks} currentUserId={profile.id} port={port} onMoved={load} />;
}
