import type { AnnouncementItem, AnnouncementComment } from '@/types/announcements';
import { apiUrl, USE_MOCK } from '@/services/api-config';
import { api, apiFetch } from '@/services/api-client';

export type { AnnouncementItem, AnnouncementComment };

/* The backend links each image as a path on its own origin (a signed
   /announcements/:id/image URL — see backend functions/announcement-images.ts)
   rather than inlining it, and this app talks to the backend on a separate
   domain, so the path needs the API's origin in front of it. */
export function withAbsoluteImageUrl(announcement: AnnouncementItem): AnnouncementItem {
  return announcement.imageUrl?.startsWith('/')
    ? { ...announcement, imageUrl: apiUrl(announcement.imageUrl) }
    : announcement;
}

/* Unlike GET /events, GET /announcements requires auth — isLikedByMe is
   computed per requesting user, so the backend needs to know who's asking.
   Called client-side with the signed-in member's own token (see
   app/dashboard/page.tsx), not server-side without one. */
export async function getAnnouncements(token: string): Promise<AnnouncementItem[]> {
  if (USE_MOCK) {
    const { getAnnouncements: mockGetAnnouncements } = await import('@/mocks/functions/announcements');
    return mockGetAnnouncements();
  }

  const data = await api<AnnouncementItem[]>('/announcements', { token, errorMessage: 'Failed to load announcements' });
  return data.map(withAbsoluteImageUrl);
}

/* Director/executive/admin only — the backend enforces this (403s
   otherwise); the frontend only offers the composer when it already knows
   that's true (see NewItemDialog), same trust boundary as everywhere else. */
export async function createAnnouncement(
  token: string,
  input: { content: string; imageUrl?: string },
): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { createAnnouncement: mockCreateAnnouncement } = await import('@/mocks/functions/announcements');
    return mockCreateAnnouncement(input);
  }

  return withAbsoluteImageUrl(
    await api<AnnouncementItem>('/announcements', {
      method: 'POST',
      token,
      body: input,
      errorMessage: 'Failed to create announcement',
    }),
  );
}

/* Author or admin only — the backend enforces this (403s otherwise); the
   frontend only offers Edit when it already knows that's true (see
   AnnouncementRow). imageUrl: null explicitly clears an existing image. */
export async function updateAnnouncement(
  token: string,
  announcementId: number,
  input: { content?: string; imageUrl?: string | null },
): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { updateAnnouncement: mockUpdateAnnouncement } = await import('@/mocks/functions/announcements');
    return mockUpdateAnnouncement(announcementId, input);
  }

  return withAbsoluteImageUrl(
    await api<AnnouncementItem>(`/announcements/${announcementId}`, {
      method: 'PATCH',
      token,
      body: input,
      errorMessage: 'Failed to update announcement',
    }),
  );
}

/* Author or admin only — the backend enforces this (403s otherwise); the
   frontend only offers Delete when it already knows that's true (see
   AnnouncementRow). */
export async function deleteAnnouncement(token: string, announcementId: number): Promise<void> {
  if (USE_MOCK) {
    const { deleteAnnouncement: mockDeleteAnnouncement } = await import('@/mocks/functions/announcements');
    return mockDeleteAnnouncement(announcementId);
  }

  await apiFetch(`/announcements/${announcementId}`, {
    method: 'DELETE',
    token,
    errorMessage: 'Failed to delete announcement',
  });
}

export async function likeAnnouncement(token: string, announcementId: number): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { likeAnnouncement: mockLike } = await import('@/mocks/functions/announcements');
    return mockLike(announcementId);
  }

  return withAbsoluteImageUrl(
    await api<AnnouncementItem>(`/announcements/${announcementId}/like`, {
      method: 'POST',
      token,
      errorMessage: 'Failed to like announcement',
    }),
  );
}

export async function unlikeAnnouncement(token: string, announcementId: number): Promise<AnnouncementItem> {
  if (USE_MOCK) {
    const { unlikeAnnouncement: mockUnlike } = await import('@/mocks/functions/announcements');
    return mockUnlike(announcementId);
  }

  return withAbsoluteImageUrl(
    await api<AnnouncementItem>(`/announcements/${announcementId}/like`, {
      method: 'DELETE',
      token,
      errorMessage: 'Failed to unlike announcement',
    }),
  );
}

export async function getComments(token: string, announcementId: number): Promise<AnnouncementComment[]> {
  if (USE_MOCK) {
    const { getComments: mockGetComments } = await import('@/mocks/functions/announcements');
    return mockGetComments(announcementId);
  }

  return api<AnnouncementComment[]>(`/announcements/${announcementId}/comments`, {
    token,
    errorMessage: 'Failed to load comments',
  });
}

export async function addComment(token: string, announcementId: number, content: string): Promise<AnnouncementComment> {
  if (USE_MOCK) {
    const { addComment: mockAddComment } = await import('@/mocks/functions/announcements');
    return mockAddComment(announcementId, content);
  }

  return api<AnnouncementComment>(`/announcements/${announcementId}/comments`, {
    method: 'POST',
    token,
    body: { content },
    errorMessage: 'Failed to add comment',
  });
}
