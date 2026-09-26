import type { UserCalendarEvent } from '@/services/user-calendar-api';

/* Personal (non-EngSoc) events on the signed-in mock member's own "Google
   Calendar" — separate from mockEvents (the shared/official EngSoc events),
   since in the real app these live on two entirely different calendars. */
export const mockPersonalEvents: UserCalendarEvent[] = [];
