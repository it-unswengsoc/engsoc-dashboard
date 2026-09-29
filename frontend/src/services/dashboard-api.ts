import type { EventItem } from '@/types/events';
import type { TaskItem } from '@/types/tasks';
import type { AnnouncementItem } from '@/types/announcements';
import { apiUrl } from '@/services/api-config';
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

/* The last dashboard this tab loaded, so coming back to it (from another
   page, or after a reload) shows it straight away while a fresh copy loads
   behind it. Kept in memory for client-side navigation and in
   sessionStorage for reloads; tied to the token it was loaded with, so a
   different sign-in in the same tab never sees someone else's. Small
   enough for sessionStorage now that images aren't inlined. */
const CACHE_KEY = 'dashboard-cache';

let memoryCache: { token: string; data: DashboardData } | null = null;

export function readCachedDashboard(token: string): DashboardData | null {
  if (memoryCache?.token === token) return memoryCache.data;
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { token: string; data: DashboardData };
    if (parsed.token !== token) return null;
    memoryCache = parsed;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCachedDashboard(token: string, data: DashboardData): void {
  memoryCache = { token, data };
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // Storage full or unavailable — the in-memory copy still covers navigation.
  }
}
