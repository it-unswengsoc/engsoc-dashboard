import type { UserPortfolio } from './admin';

/* The one place that decides where each kind of request goes and who there
   can act on it. The frontend's forms (components/dialogs/NewItemDialog.tsx)
   send a requestType and their answers; everything below is decided here,
   so a request can't be steered to a different port or past its approvers
   by editing the submitted payload. */

export type ApproverRole = 'director' | 'executive';

export interface RequestTypeDef {
  label: string; // "Event photo request", for notifications
  targetPort: UserPortfolio;
  /* Who in targetPort sees incoming requests of this type and can accept,
     reject, assign and complete them. */
  approverRoles: ApproverRole[];
  /* Whether accepting hands the work to port members as a task. When false,
     the approver handles it themselves and nobody else sees it. */
  assignable: boolean;
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
    approverRoles: ['director', 'executive'],
    assignable: true,
    confidential: false,
    allowsAnonymous: false,
    titleField: 'eventName',
    neededByFields: ['eventLaunchDate', 'eventDate'],
  },
  mass_email: {
    label: 'Mass email request',
    targetPort: 'IT',
    approverRoles: ['director', 'executive'],
    assignable: true,
    confidential: false,
    allowsAnonymous: false,
    neededByFields: ['releaseDate'],
  },
  event_photos: {
    label: 'Event photo request',
    targetPort: 'publication',
    approverRoles: ['director', 'executive'],
    assignable: true,
    confidential: false,
    allowsAnonymous: false,
    neededByFields: ['eventDate'],
  },
  multimedia: {
    label: 'Multimedia request',
    targetPort: 'publication',
    approverRoles: ['director', 'executive'],
    assignable: true,
    confidential: false,
    allowsAnonymous: false,
    neededByFields: ['dueDate'],
  },
  reimbursement: {
    label: 'Reimbursement request',
    targetPort: 'treasurer',
    approverRoles: ['director', 'executive'],
    assignable: true,
    confidential: false,
    allowsAnonymous: false,
    titleField: 'title',
    neededByFields: [],
    attachment: { field: 'receipt', required: true },
  },
  grievance: {
    label: 'Grievance',
    targetPort: 'HR',
    approverRoles: ['executive'],
    assignable: false,
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
}

/* Directors/executives of the type's port (executives only, for a
   grievance), plus admins for anything that isn't confidential. */
export function canActOn(viewer: Viewer, type: RequestTypeDef): boolean {
  if (viewer.role === 'admin' && !type.confidential) return true;
  return viewer.port === type.targetPort && (type.approverRoles as string[]).includes(viewer.role);
}

/* The request types a viewer handles, for filtering the incoming list. */
export function actionableRequestTypes(viewer: Viewer): string[] {
  return Object.keys(REQUEST_TYPES).filter((key) => canActOn(viewer, REQUEST_TYPES[key]));
}
