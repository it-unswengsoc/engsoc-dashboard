import { redirect } from 'next/navigation';

export default function CalendarIndexPage() {
  redirect('/dashboard/calendar/month');
}
