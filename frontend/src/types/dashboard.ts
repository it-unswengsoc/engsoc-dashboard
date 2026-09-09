import type { EventType } from '@/types/events';

/* Display shapes — what the dashboard page's row components take,
   derived from the raw service types via services/dashboard.ts's mappers. */

export interface EventRowData {
  id: number;
  month: string;      // "AUG"
  day: number;        // 21
  name: string;
  type: EventType;
  dateString: string; // "21/08/26"
  time: string;       // "7:30pm"
}

export interface TaskRowData {
  id: number;
  daysTillDue: number;
  name: string;
  dateString: string; // "Mon, 1 June"
  time: string;       // "9:30PM"
}

export interface DashboardStats {
  openTasks: string;          // "3/5"
  upcomingEvents: string;     // "4"
  newAnnouncements: string;   // "2"
}
