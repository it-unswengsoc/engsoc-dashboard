/* Dispatched on window after an event/task/announcement is created elsewhere
   in the app (see NewItemDialog) — the dashboard page listens for it to
   refetch its own data. Same pattern as lib/calendar.ts's
   CALENDAR_EVENTS_CHANGED_EVENT, for the same reason: the dashboard now
   fetches tasks/announcements client-side (they carry per-user data), so a
   Server Component refresh (router.refresh()) wouldn't reach it. */
export const DASHBOARD_DATA_CHANGED_EVENT = 'engsoc:dashboard-data-changed';
