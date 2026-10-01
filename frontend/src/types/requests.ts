/* Mirrors backend/src/functions/requests.ts's Request. `status` matches the
   request_status enum; `targetPort` matches port_type. */
export type RequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed';

import type { Member } from '@/types/members';

export type { Member };

export interface RequestAttachment {
  id: number;
  fieldName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface RequestItem {
  id: number;
  requestType: string; // 'marketing' | 'mass_email' | 'event_photos' | ...
  title: string;
  targetPort: string; // the port it's filed under
  formData: Record<string, unknown>;
  status: RequestStatus;
  isAnonymous: boolean;
  neededBy: string | null;
  /* Added when accepting — context for whoever picks the work up. */
  notes: string | null;
  /* Added when rejecting, so the requester isn't left guessing. */
  rejectionReason: string | null;
  /* All three null on an anonymous request, for everyone but the requester. */
  requesterId: number | null;
  requesterName: string | null;
  requesterPort: string | null;
  handledBy: number | null;
  handledByName: string | null;
  /* The task accepting created, shared by `assignees`. Null until accepted,
     and always for a type that isn't assigned out (grievances, reimbursements). */
  taskId: number | null;
  assignees: Member[];
  attachments: RequestAttachment[];
  createdAt: string; // ISO date string
  updatedAt: string;
  resolvedAt: string | null;
  /* Whether the viewer can accept, reject, reassign or complete it. */
  canAction: boolean;
  /* Whether accepting hands it to port members of the approver's choosing.
     False for grievances and reimbursements, which whoever accepts handles
     directly. */
  assignable: boolean;
  /* Otherwise, whether accepting still puts it on the approver's own task
     list (reimbursements do; grievances don't). */
  approverTask: boolean;
}

/* ---------- Display shape (what the requests page renders) ---------- */

/* form_data is JSONB, so its keys differ per request type. The page shows
   label/value pairs built from the form definitions (lib/request-forms.ts)
   rather than raw keys. */
export interface RequestAnswer {
  label: string;
  value: string;
}

export interface RequestDetail extends RequestItem {
  typeLabel: string; // "Event photo request"
  answers: RequestAnswer[];
}

export interface RequestsData {
  /* Requests the viewer handles. */
  incoming: RequestDetail[];
  /* Requests the viewer submitted. */
  mine: RequestDetail[];
  /* The request types the viewer handles — empty for most members, who
     only ever see their own submissions. */
  handles: string[];
}
