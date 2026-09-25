import type { AnnouncementItem, AnnouncementComment } from '@/types/announcements';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { AnnouncementItem, AnnouncementComment };

/* Server-fetched (no token) for the dashboard's initial render — matches
   events-api.ts's getEvents. isLikedByMe needs a signed-in user to mean
   anything, but the backend already requires auth on GET /announcements for
   exactly that reason; the frontend calls it from a Server Component here
   the same way it calls GET /events, without a token. That's fine for
   *reading* the club-wide feed — write actions below (like/comment) do
   carry a token, client-side, same as everywhere else in this app. */
export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  if (USE_MOCK) {
    const { getAnnouncements: mockGetAnnouncements } = await import('@/mocks/functions/announcements');
    return mockGetAnnouncements();
  }

  const res = await fetch(apiUrl('/announcements'), { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load announcements');
  return data.data as AnnouncementItem[];
}

/* Director/executive/admin only — the backend enforces this (403s
   otherwise); the frontend only offers the composer when it already knows
   that's true (see NewItemDialog), same trust boundary as everywhere else. */
export async function createAnnouncement(
  token: string,
  input: { content: string; imageUrl?: string }
): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { createAnnouncement: mockCreateAnnouncement } = await import('@/mocks/functions/announcements');
    return mockCreateAnnouncement(input);
  }

  const res = await fetch(apiUrl('/announcements'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create announcement');
  return data.data as AnnouncementItem;
}

export async function likeAnnouncement(token: string, announcementId: number): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { likeAnnouncement: mockLike } = await import('@/mocks/functions/announcements');
    return mockLike(announcementId);
  }

  const res = await fetch(apiUrl(`/announcements/${announcementId}/like`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to like announcement');
  return data.data as AnnouncementItem;
}

export async function unlikeAnnouncement(token: string, announcementId: number): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { unlikeAnnouncement: mockUnlike } = await import('@/mocks/functions/announcements');
    return mockUnlike(announcementId);
  }

  const res = await fetch(apiUrl(`/announcements/${announcementId}/like`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to unlike announcement');
  return data.data as AnnouncementItem;
}

export async function getComments(token: string, announcementId: number): Promise<AnnouncementComment[]> {
  if (USE_MOCK) {
    const { getComments: mockGetComments } = await import('@/mocks/functions/announcements');
    return mockGetComments(announcementId);
  }

  const res = await fetch(apiUrl(`/announcements/${announcementId}/comments`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load comments');
  return data.data as AnnouncementComment[];
}

export async function addComment(
  token: string,
  announcementId: number,
  content: string
): Promise<AnnouncementComment> {
  if (USE_MOCK) {
    const { addComment: mockAddComment } = await import('@/mocks/functions/announcements');
    return mockAddComment(announcementId, content);
  }

  const res = await fetch(apiUrl(`/announcements/${announcementId}/comments`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add comment');
  return data.data as AnnouncementComment;
}
