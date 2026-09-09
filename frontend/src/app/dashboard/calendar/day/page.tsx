'use client';

import TimeGridView from '@/components/calendar/TimeGridView';
import { useCalendarContext } from '@/components/calendar/CalendarContext';

export default function CalendarDayPage() {
  const { items, anchor, setSelected } = useCalendarContext();

  return <TimeGridView days={[anchor]} items={items} onSelectItem={setSelected} />;
}
