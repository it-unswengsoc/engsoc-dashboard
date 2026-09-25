import type { AnnouncementItem, AnnouncementComment } from '@/types/announcements';
import { mockAnnouncements, mockComments } from '@/mocks/data/announcements';
import { mockProfile } from '@/mocks/data/auth';

/* Returns a copy, not the live mockAnnouncements array itself — callers
   that hold this in React state (the dashboard) compare by reference to
   decide whether to re-render, and mutating in place (unshift/like/etc.)
   would leave that reference unchanged even though its contents did, so
   React would never notice a create/like/comment actually happened. */
export async function getAnnouncements(): Promise<AnnouncementItem[]> {
  return mockAnnouncements.slice();
}

function mockId(): number {
  return Math.max(0, ...mockAnnouncements.map((a) => a.id)) + 1;
}

/* Mutates mockAnnouncements/mockComments directly (module-level, in-memory)
   so the feed reflects a post/like/comment immediately in local dev —
   resets on reload, same as every other in-memory mock in this app. The
   signed-in mock account (mocks/data/auth.ts's mockProfile) stands in for
   "the current user" everywhere a real backend would read it off the JWT. */

export async function createAnnouncement(input: { content: string; imageUrl?: string }): Promise<AnnouncementItem> {
  const announcement: AnnouncementItem = {
    id: mockId(),
    authorId: mockProfile.id,
    authorName: `${mockProfile.firstName} ${mockProfile.lastName}`,
    authorRole: mockProfile.role,
    content: input.content,
    imageUrl: input.imageUrl ?? null,
    likeCount: 0,
    isLikedByMe: false,
    commentCount: 0,
    createdAt: new Date().toISOString(),
  };
  mockAnnouncements.unshift(announcement);
  return announcement;
}

export async function updateAnnouncement(
  announcementId: number,
  input: { content?: string; imageUrl?: string | null }
): Promise<AnnouncementItem> {
  const announcement = mockAnnouncements.find((a) => a.id === announcementId);
  if (!announcement) throw new Error('Announcement not found');
  if (input.content !== undefined) announcement.content = input.content;
  if (input.imageUrl !== undefined) announcement.imageUrl = input.imageUrl;
  return announcement;
}

export async function likeAnnouncement(announcementId: number): Promise<AnnouncementItem> {
  const announcement = mockAnnouncements.find((a) => a.id === announcementId);
  if (!announcement) throw new Error('Announcement not found');
  if (!announcement.isLikedByMe) {
    announcement.isLikedByMe = true;
    announcement.likeCount += 1;
  }
  return announcement;
}

export async function unlikeAnnouncement(announcementId: number): Promise<AnnouncementItem> {
  const announcement = mockAnnouncements.find((a) => a.id === announcementId);
  if (!announcement) throw new Error('Announcement not found');
  if (announcement.isLikedByMe) {
    announcement.isLikedByMe = false;
    announcement.likeCount = Math.max(0, announcement.likeCount - 1);
  }
  return announcement;
}

export async function getComments(announcementId: number): Promise<AnnouncementComment[]> {
  return (mockComments[announcementId] ?? []).slice();
}

export async function addComment(announcementId: number, content: string): Promise<AnnouncementComment> {
  const announcement = mockAnnouncements.find((a) => a.id === announcementId);
  if (!announcement) throw new Error('Announcement not found');

  const comment: AnnouncementComment = {
    id: Date.now(),
    announcementId,
    authorId: mockProfile.id,
    authorName: `${mockProfile.firstName} ${mockProfile.lastName}`,
    authorRole: mockProfile.role,
    content,
    createdAt: new Date().toISOString(),
  };
  mockComments[announcementId] = [...(mockComments[announcementId] ?? []), comment];
  announcement.commentCount += 1;
  return comment;
}
