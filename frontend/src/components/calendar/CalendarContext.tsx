'use client';

import { createContext, useContext } from 'react';
import type { CalendarItem } from '@/lib/calendar';

export interface CalendarContextValue {
  items: CalendarItem[];
  anchor: Date;
  setAnchor: (date: Date) => void;
  selected: CalendarItem | null;
  setSelected: (item: CalendarItem | null) => void;
}

export const CalendarContext = createContext<CalendarContextValue | null>(null);

/* Lets the day/week/month/year leaf pages read the shell's shared state
   without prop drilling through the layout boundary. */
export function useCalendarContext(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) {
    throw new Error('useCalendarContext must be used within CalendarShell');
  }
  return ctx;
}
