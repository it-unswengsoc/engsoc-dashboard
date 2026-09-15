// -- Shared domain types
// All shared TypeScript types live here. Import from this file instead of defining types inline in components and stuff.
// Field names are camelCase because that's what the API returns (the backend converts from snake_case before sending).

// -- Enums 

export type UserRole = 'member' | 'executive' | 'admin';

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export type NotificationType = 'event' | 'alert' | 'announcement';

// -- User
// matches object returned by GET /api/auth/profile -- which backend exports it as 'Profile'
// this mirrors the backend interfaces so if backend changes a field, frontend types needs to be changed here to match

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string; // ISO datetime
}

export type Profile = User;

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
}

// -- Event -- matches backend interface
// eventDate / createdAt / updatedAt are ISO datetime strings.

export type EventType = 'internal' | 'external';

export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  location: string | null;
  organizerId: number;
  status: EventStatus;
  // PENDING BACKEND: not yet in schema.sql or backend/src/functions/events.ts
  eventType: EventType;
  capacity: number | null;
  createdAt: string;
  updatedAt: string;
}

// -- Notification -- matches backend interface

export interface Notification {
  id: number;
  userId: number;
  eventId: number | null;
  type: NotificationType;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

// -- Announcement 

export interface Announcement {
  id: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  isLikedByMe: boolean;
  commentCount: number;
  createdAt: string;
}

// -- Task (for my tasks on dashboard)
// no db table yet, extend when there is one

export interface TaskItem {
  id: number;
  title: string;
  isComplete: boolean;
}

// -- API response envelope 
// All backend routes wrap their payload in this shape.

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
