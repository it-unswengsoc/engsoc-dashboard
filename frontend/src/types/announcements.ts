/* Mirrors backend/src/functions/announcements.ts's Announcement. */
export interface AnnouncementItem {
  id: number;
  authorId: number | null;
  authorName: string | null;
  authorRole: string | null;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  isLikedByMe: boolean;
  commentCount: number;
  createdAt: string; // ISO date string
}

export interface AnnouncementComment {
  id: number;
  announcementId: number;
  authorId: number | null;
  authorName: string | null;
  authorRole: string | null;
  content: string;
  createdAt: string; // ISO date string
}
