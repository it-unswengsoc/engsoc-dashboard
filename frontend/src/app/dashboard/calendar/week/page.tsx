'use client';

import TimeGridView from '@/components/calendar/TimeGridView';
import { useCalendarContext } from '@/components/calendar/CalendarContext';
import { getWeekDays } from '@/lib/calendar';

export default function CalendarWeekPage() {
  const { items, anchor, setSelected } = useCalendarContext();

  return <TimeGridView days={getWeekDays(anchor)} items={items} onSelectItem={setSelected} />;
}
