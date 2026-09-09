'use client';

import { useRouter } from 'next/navigation';
import YearView from '@/components/calendar/YearView';
import { useCalendarContext } from '@/components/calendar/CalendarContext';

export default function CalendarYearPage() {
  const router = useRouter();
  const { items, anchor, setAnchor } = useCalendarContext();

  return (
    <YearView
      anchor={anchor}
      items={items}
      onSelectMonth={(monthDate) => {
        setAnchor(monthDate);
        router.push('/dashboard/calendar/month');
      }}
    />
  );
}
