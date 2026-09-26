import type { AnnouncementItem, AnnouncementComment } from '@/types/announcements';
import { apiUrl } from '@/services/api-config';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { AnnouncementItem, AnnouncementComment };

/* Unlike GET /events, GET /announcements requires auth — isLikedByMe is
   computed per requesting user, so the backend needs to know who's asking.
   Called client-side with the signed-in member's own token (see
   app/dashboard/page.tsx), not server-side without one. */
export async function getAnnouncements(token: string): Promise<AnnouncementItem[]> {
  if (USE_MOCK) {
    const { getAnnouncements: mockGetAnnouncements } = await import('@/mocks/functions/announcements');
    return mockGetAnnouncements();
  }

  const res = await fetch(apiUrl('/announcements'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
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

/* Author or admin only — the backend enforces this (403s otherwise); the
   frontend only offers Edit when it already knows that's true (see
   AnnouncementRow). imageUrl: null explicitly clears an existing image. */
export async function updateAnnouncement(
  token: string,
  announcementId: number,
  input: { content?: string; imageUrl?: string | null }
): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { updateAnnouncement: mockUpdateAnnouncement } = await import('@/mocks/functions/announcements');
    return mockUpdateAnnouncement(announcementId, input);
  }

  const res = await fetch(apiUrl(`/announcements/${announcementId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update announcement');
  return data.data as AnnouncementItem;
}

/* Author or admin only — the backend enforces this (403s otherwise); the
   frontend only offers Delete when it already knows that's true (see
   AnnouncementRow). */
export async function deleteAnnouncement(token: string, announcementId: number): Promise<void> {
  if (USE_MOCK) {
    const { deleteAnnouncement: mockDeleteAnnouncement } = await import('@/mocks/functions/announcements');
    return mockDeleteAnnouncement(announcementId);
  }

  const res = await fetch(apiUrl(`/announcements/${announcementId}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete announcement');
  }
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
