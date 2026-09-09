'use client';

import { useRouter } from 'next/navigation';
import MonthView from '@/components/calendar/MonthView';
import { useCalendarContext } from '@/components/calendar/CalendarContext';

export default function CalendarMonthPage() {
  const router = useRouter();
  const { items, anchor, setAnchor, setSelected } = useCalendarContext();

  return (
    <MonthView
      anchor={anchor}
      items={items}
      onSelectItem={setSelected}
      onSelectDay={(day) => {
        setAnchor(day);
        router.push('/dashboard/calendar/day');
      }}
    />
  );
}
