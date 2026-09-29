import type { EventItem } from '@/types/events';
import type { TaskItem } from '@/types/tasks';
import type { AnnouncementItem } from '@/types/announcements';
import { apiUrl } from '@/services/api-config';
import { readSessionCache, writeSessionCache } from '@/lib/session-cache';
import { getEvents, toEventItem, type RawEvent } from '@/services/events-api';
import { getTasks, toTaskItem, type RawTask } from '@/services/tasks-api';
import { getAnnouncements, withAbsoluteImageUrl } from '@/services/announcements-api';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export interface DashboardData {
  events: EventItem[]; // upcoming only
  tasks: TaskItem[]; // cancelled left out
  announcements: AnnouncementItem[];
}

/* Everything the dashboard home page shows, from one GET /dashboard — one
   round trip instead of three, so the sections arrive together. */
export async function getDashboard(token: string): Promise<DashboardData> {
  if (USE_MOCK) {
    const [events, tasks, announcements] = await Promise.all([getEvents(), getTasks(token), getAnnouncements(token)]);
    const now = Date.now();
    return { events: events.filter((e) => new Date(e.startsAt).getTime() >= now), tasks, announcements };
  }

  const res = await fetch(apiUrl('/dashboard'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load dashboard');
  const raw = data.data as { events: RawEvent[]; tasks: RawTask[]; announcements: AnnouncementItem[] };
  return {
    events: raw.events.map(toEventItem),
    tasks: raw.tasks.map(toTaskItem),
    announcements: raw.announcements.map(withAbsoluteImageUrl),
  };
}

/* The last dashboard this tab loaded, shown straight away on the next
   visit while a fresh copy loads (see lib/session-cache.ts). Small enough
   for sessionStorage now that images aren't inlined. */
const CACHE_KEY = 'dashboard-cache';

export function readCachedDashboard(token: string): DashboardData | null {
  return readSessionCache<DashboardData>(CACHE_KEY, token);
}

export function writeCachedDashboard(token: string, data: DashboardData): void {
  writeSessionCache(CACHE_KEY, token, data);
}
