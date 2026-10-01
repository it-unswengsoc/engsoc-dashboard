import type { UserPortfolio } from './admin';

/* The one place that decides where each kind of request goes and who there
   can act on it. The frontend's forms (components/dialogs/NewItemDialog.tsx)
   send a requestType and their answers; everything below is decided here,
   so a request can't be steered to a different port or past its approvers
   by editing the submitted payload. */

export type ApproverRole = 'director' | 'executive';

/* Who sees incoming requests of a type and can accept, reject, assign and
   complete them: members of targetPort holding one of `roles`, or the
   treasurer (users.is_treasurer), a position rather than a port. */
export type Approvers = { kind: 'port'; roles: ApproverRole[] } | { kind: 'treasurer' };

export interface RequestTypeDef {
  label: string; // "Event photo request", for notifications
  /* The port it's filed under, and whose members it can be assigned to. */
  targetPort: UserPortfolio;
  approvers: Approvers;
  /* Whether accepting hands the work to port members of the approver's
     choosing, as a task. When false, the approver handles it themselves. */
  assignable: boolean;
  /* For a type that isn't assignable: whether accepting still puts it on
     the approver's own task list. Off for a grievance, whose task would
     show on the HR board for the whole port to see. */
  approverTask: boolean;
  /* Kept from admins, who otherwise see and can act on every request. */
  confidential: boolean;
  /* Whether the requester can hide their name from whoever handles it. */
  allowsAnonymous: boolean;
  /* The form field holding the title. Types without one take an explicit
     title alongside the form. */
  titleField?: string;
  /* The form's date fields to use as needed_by, first one filled in wins. */
  neededByFields: string[];
  /* The form field that carries a file, and whether it's required. */
  attachment?: { field: string; required: boolean };
}

export const REQUEST_TYPES: Record<string, RequestTypeDef> = {
  marketing: {
    label: 'Marketing request',
    targetPort: 'marketing',
    approvers: { kind: 'port', roles: ['director', 'executive'] },
    assignable: true,
    approverTask: false,
    confidential: false,
    allowsAnonymous: false,
    titleField: 'eventName',
    neededByFields: ['eventLaunchDate', 'eventDate'],
  },
  mass_email: {
    label: 'Mass email request',
    targetPort: 'IT',
    approvers: { kind: 'port', roles: ['director', 'executive'] },
    assignable: true,
    approverTask: false,
    confidential: false,
    allowsAnonymous: false,
    neededByFields: ['releaseDate'],
  },
  event_photos: {
    label: 'Event photo request',
    targetPort: 'publication',
    approvers: { kind: 'port', roles: ['director', 'executive'] },
    assignable: true,
    approverTask: false,
    confidential: false,
    allowsAnonymous: false,
    neededByFields: ['eventDate'],
  },
  multimedia: {
    label: 'Multimedia request',
    targetPort: 'publication',
    approvers: { kind: 'port', roles: ['director', 'executive'] },
    assignable: true,
    approverTask: false,
    confidential: false,
    allowsAnonymous: false,
    neededByFields: ['dueDate'],
  },
  reimbursement: {
    label: 'Reimbursement request',
    // Filed under Cabinet, where the treasurer sits, but handled by the
    // treasurer alone.
    targetPort: 'cabinet',
    approvers: { kind: 'treasurer' },
    assignable: false,
    approverTask: true,
    confidential: false,
    allowsAnonymous: false,
    titleField: 'title',
    neededByFields: [],
    attachment: { field: 'receipt', required: true },
  },
  grievance: {
    label: 'Grievance',
    targetPort: 'HR',
    approvers: { kind: 'port', roles: ['executive'] },
    assignable: false,
    approverTask: false,
    confidential: true,
    allowsAnonymous: true,
    titleField: 'title',
    neededByFields: [],
  },
};

export function getRequestType(requestType: string): RequestTypeDef | null {
  return Object.prototype.hasOwnProperty.call(REQUEST_TYPES, requestType) ? REQUEST_TYPES[requestType] : null;
}

export interface Viewer {
  id: number;
  role: string;
  port: string | null;
  isTreasurer: boolean;
}

/* The type's approvers (directors/executives of its port, executives only
   for a grievance, the treasurer for a reimbursement), plus admins for
   anything that isn't confidential. */
export function canActOn(viewer: Viewer, type: RequestTypeDef): boolean {
  if (viewer.role === 'admin' && !type.confidential) return true;
  if (type.approvers.kind === 'treasurer') return viewer.isTreasurer;
  return viewer.port === type.targetPort && (type.approvers.roles as string[]).includes(viewer.role);
}

/* The request types a viewer handles, for filtering the incoming list. */
export function actionableRequestTypes(viewer: Viewer): string[] {
  return Object.keys(REQUEST_TYPES).filter((key) => canActOn(viewer, REQUEST_TYPES[key]));
}
