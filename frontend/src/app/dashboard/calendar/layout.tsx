import CalendarShell from '@/components/calendar/CalendarShell';

/* Events come from the signed-in member's own Google Calendar, and tasks
   carry per-user data too (whose task it is) — both need the JWT held in
   the browser's sessionStorage, which a Server Component can't reach, so
   CalendarShell fetches both itself, client-side. */
export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <CalendarShell>{children}</CalendarShell>;
}
