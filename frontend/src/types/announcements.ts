export interface AnnouncementItem {
  id: number;
  posterName: string;
  posterRole: string;
  posterAvatar: string;
  image?: string;
  description: string;
  postedAt: string; // ISO date string
  read: boolean;
}
