import type { DirectoryUser } from '@/types/directory';

/* Mirrors mocks/data/admin.ts's mockUsers (same people), trimmed to the
   public directory shape — no isActive/lastLogin/hasGoogleAccount here,
   matching what the real non-admin GET /users actually returns. */
export const mockDirectory: DirectoryUser[] = [
  { id: 1, firstName: 'Admin', lastName: 'User', email: 'admin@engsoc.com', role: 'admin', port: null },
  { id: 2, firstName: 'Zachary', lastName: 'Abran', email: 'zachary.abran@unswengsoc.com', role: 'admin', port: 'IT' },
  { id: 3, firstName: 'Winnie', lastName: 'Moy', email: 'winnie.moy@unswengsoc.com', role: 'admin', port: 'cabinet' },
  { id: 4, firstName: 'Ethan', lastName: 'Bian', email: 'ethan.bian@unswengsoc.com', role: 'director', port: 'marketing' },
  { id: 5, firstName: 'EngSoc', lastName: 'IT', email: 'general.it@unswengsoc.com', role: 'member', port: null },
];
