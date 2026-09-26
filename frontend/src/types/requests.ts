/* Mirrors the requests table in database/create-tables.sql. `status` matches
   the request_status enum; `targetPort` matches port_type. */
export type RequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed';

export interface RequestItem {
  id: number;
  requestType: string; // 'marketing' | 'mass_email' | 'event_photos' | ...
  title: string;
  targetPort: string; // the port that actions it
  requesterId: number;
  requesterName: string;
  requesterPort: string;
  status: RequestStatus;
  submittedAt: string; // ISO date string
  neededBy?: string;
}

/* ---------- Display shape (what the requests page renders) ---------- */

/* form_data is JSONB, so its keys differ per request type. The page shows
   label/value pairs rather than raw keys — a mapper builds these from the
   form definitions once submissions are real. */
export interface RequestAnswer {
  label: string;
  value: string;
}

import type { Member } from '@/types/members';

export type { Member };

export interface RequestDetail extends RequestItem {
  typeLabel: string; // "Event photo request"
  answers: RequestAnswer[];
  /* Who's doing the work. Each of these becomes a task row carrying the
     request's id, so it lands in that person's My tasks. */
  assignedTo: Member[];
  /* Added when accepting — context for whoever picks the work up. */
  notes?: string;
  /* Added when rejecting, so the requester isn't left guessing. */
  rejectionReason?: string;
}
