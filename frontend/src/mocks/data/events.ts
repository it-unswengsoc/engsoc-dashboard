import type { EventItem } from '@/types/events';
import { at } from '@/mocks/data/date-helpers';

export const mockEvents: EventItem[] = [
  {
    id: 1,
    name: 'Careers Night',
    type: 'INTERNAL',
    startsAt: at(2, '21:30'),
  },
  {
    id: 2,
    name: 'Love Roulette',
    type: 'EXTERNAL',
    startsAt: at(9, '19:30'),
  },
  {
    id: 3,
    name: 'BESS x Engsoc BBQ',
    type: 'EXTERNAL',
    startsAt: at(23, '12:00'),
  },
  {
    id: 4,
    name: 'End of Term Ball',
    type: 'EXTERNAL',
    startsAt: at(40, '18:00'),
  },
];
