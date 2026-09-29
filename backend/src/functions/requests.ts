import {
  dbGetRequestsOfTypes,
  dbGetRequestsByRequester,
  dbGetRequestById,
  dbCreateRequest,
  dbAcceptRequest,
  dbSetTaskAssignees,
  dbRejectRequest,
  dbCompleteRequest,
  dbGetRequestAttachment,
  dbGetRequestViewer,
  dbGetPortMemberIds,
  dbGetTreasurerIds,
  type NewAttachment,
} from '../database/requests';
import { createNotificationsBulk, type CreateNotificationInput } from './notifications';
import type { TaskAssignee } from './tasks';
import {
  getRequestType,
  canActOn,
  actionableRequestTypes,
  type RequestTypeDef,
  type Viewer,
} from './request-types';

// Matches the request_status enum. 'approved' exists in the schema but
// nothing moves a request into it: accepting goes straight to in_progress.
export type RequestStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'completed';

export interface RequestAttachmentMeta {
  id: number;
  fieldName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/* A request as stored, requester included whatever is_anonymous says. Only
   ever handed out through toView, which hides them where it should. */
export interface RequestRecord {
  id: number;
  requestType: string;
  title: string;
  targetPort: string;
  formData: Record<string, unknown>;
  status: RequestStatus;
  isAnonymous: boolean;
  neededBy: string | null;
  notes: string | null;
  rejectionReason: string | null;
  requesterId: number | null;
  requesterName: string | null;
  requesterPort: string | null;
  handledBy: number | null;
  handledByName: string | null;
  taskId: number | null;
  assignees: TaskAssignee[];
  attachments: RequestAttachmentMeta[];
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/* What a viewer is sent. `canAction` is whether they can accept, reject,
   reassign or complete it. */
export interface Request extends RequestRecord {
  canAction: boolean;
}

/** Thrown when there's no such request, or the viewer isn't allowed to know it exists. */
export class RequestNotFoundError extends Error {}

/** Thrown when the viewer can see a request but not act on it. */
export class ForbiddenRequestError extends Error {}

/** Thrown for a bad submission or action body — the route answers 400. */
export class RequestValidationError extends Error {}

export { RequestStatusConflictError } from '../database/requests';

/* Fits in one request body under Vercel's 4.5MB limit once base64 adds its
   third. A phone photo of a receipt or a PDF is well under this. */
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];
const MAX_FORM_DATA_LENGTH = 50_000;
const MAX_TEXT_LENGTH = 2000;

/* Hides the requester of an anonymous request from everyone but themself. */
function toView(record: RequestRecord, viewer: Viewer, type: RequestTypeDef | null): Request {
  const hideRequester = record.isAnonymous && record.requesterId !== viewer.id;
  return {
    ...record,
    ...(hideRequester ? { requesterId: null, requesterName: null, requesterPort: null } : {}),
    canAction: type ? canActOn(viewer, type) : false,
  };
}

async function getViewer(userId: number): Promise<Viewer & { name: string }> {
  const viewer = await dbGetRequestViewer(userId);
  if (!viewer) throw new ForbiddenRequestError('Your account is not active');
  return viewer;
}

/* The requester, its approvers, and whoever it's been assigned to can see
   a request; nobody else learns it exists. */
function canView(viewer: Viewer, record: RequestRecord, type: RequestTypeDef | null): boolean {
  if (record.requesterId === viewer.id) return true;
  if (type && canActOn(viewer, type)) return true;
  return record.assignees.some((a) => a.id === viewer.id);
}

/* Loads a request the viewer can act on, or throws the right error. */
async function loadActionable(userId: number, requestId: number) {
  const viewer = await getViewer(userId);
  const record = await dbGetRequestById(requestId);
  const type = record ? getRequestType(record.requestType) : null;
  if (!record || !canView(viewer, record, type)) throw new RequestNotFoundError('Request not found');
  if (!type || !canActOn(viewer, type)) throw new ForbiddenRequestError("You can't action this request");
  return { viewer, record, type };
}

/**
 * The requests page's two lists: `incoming` is every request the viewer
 * handles (their port's, for its directors/executives; everything but
 * grievances, for an admin), `mine` is what they submitted.
 */
export async function listRequests(userId: number): Promise<{ incoming: Request[]; mine: Request[] }> {
  const viewer = await getViewer(userId);
  const [incoming, mine] = await Promise.all([
    dbGetRequestsOfTypes(actionableRequestTypes(viewer)),
    dbGetRequestsByRequester(viewer.id),
  ]);
  const view = (record: RequestRecord) => toView(record, viewer, getRequestType(record.requestType));
  return { incoming: incoming.map(view), mine: mine.map(view) };
}

export interface SubmitRequestInput {
  requestType?: unknown;
  title?: unknown;
  formData?: unknown;
  attachments?: unknown;
}

/**
 * Submits a request. Which port it goes to, its title and needed-by date,
 * and whether it's anonymous all come from the type's definition and the
 * form's own fields, not from anything else in the body. The type's
 * approvers are notified.
 */
export async function submitRequest(userId: number, input: SubmitRequestInput): Promise<Request> {
  const viewer = await getViewer(userId);

  const type = typeof input.requestType === 'string' ? getRequestType(input.requestType) : null;
  if (!type) throw new RequestValidationError('Unknown request type');
  const requestType = input.requestType as string;

  const formData = parseFormData(input.formData, type);

  const explicitTitle = typeof input.title === 'string' ? input.title : '';
  const formTitle = type.titleField && typeof formData[type.titleField] === 'string' ? (formData[type.titleField] as string) : '';
  const title = (explicitTitle || formTitle).trim();
  if (!title) throw new RequestValidationError('Title is required');
  if (title.length > 255) throw new RequestValidationError('Title must be 255 characters or fewer');

  const neededBy = type.neededByFields
    .map((field) => formData[field])
    .find((value): value is string => typeof value === 'string' && !isNaN(new Date(value).getTime()));

  const isAnonymous = type.allowsAnonymous && (formData.anonymous === true || formData.anonymous === 'true');
  const attachments = parseAttachments(input.attachments, type);

  const record = await dbCreateRequest({
    requesterId: viewer.id,
    targetPort: type.targetPort,
    requestType,
    title,
    formData,
    isAnonymous,
    neededBy: neededBy ?? null,
    attachments,
  });
  if (!record) throw new Error('Request was not created');

  const approverIds =
    type.approvers.kind === 'treasurer'
      ? await dbGetTreasurerIds()
      : await dbGetPortMemberIds(type.targetPort, type.approvers.roles);
  await notify(
    approverIds.filter((id) => id !== viewer.id),
    {
      type: 'request',
      requestId: record.id,
      // A grievance's subject stays out of notifications and their emails.
      title: type.confidential ? `New ${type.label.toLowerCase()} submitted` : `New ${type.label.toLowerCase()}: ${title}`,
      message: isAnonymous ? undefined : `From ${viewer.name}`,
    }
  );

  return toView(record, viewer, type);
}

function parseFormData(raw: unknown, type: RequestTypeDef): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new RequestValidationError('formData must be an object');
  if (JSON.stringify(raw).length > MAX_FORM_DATA_LENGTH) throw new RequestValidationError('Form answers are too long');

  const formData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    // Files travel in `attachments`, never inside the answers.
    if (type.attachment && key === type.attachment.field) continue;
    const isScalar = ['string', 'number', 'boolean'].includes(typeof value) || value === null;
    const isStringList = Array.isArray(value) && value.every((item) => typeof item === 'string');
    if (!isScalar && !isStringList) throw new RequestValidationError(`Unsupported answer for "${key}"`);
    formData[key] = value;
  }
  return formData;
}

const DATA_URI = /^data:([a-z0-9.+/-]+);base64,(.+)$/is;

function parseAttachments(raw: unknown, type: RequestTypeDef): NewAttachment[] {
  const list = raw === undefined || raw === null ? [] : raw;
  if (!Array.isArray(list)) throw new RequestValidationError('attachments must be a list');
  if (!type.attachment) {
    if (list.length > 0) throw new RequestValidationError('This request type takes no attachments');
    return [];
  }
  if (list.length > 1) throw new RequestValidationError('Only one file can be attached');
  if (list.length === 0) {
    if (type.attachment.required) throw new RequestValidationError('A file is required');
    return [];
  }

  const item = list[0] as { fieldName?: unknown; fileName?: unknown; dataUri?: unknown };
  if (item.fieldName !== type.attachment.field) throw new RequestValidationError('Unexpected attachment field');
  const fileName = typeof item.fileName === 'string' ? item.fileName.trim().slice(0, 255) : '';
  if (!fileName) throw new RequestValidationError('The attachment needs a file name');

  const match = typeof item.dataUri === 'string' ? DATA_URI.exec(item.dataUri) : null;
  if (!match) throw new RequestValidationError('The attachment must be a base64 data: URI');
  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_ATTACHMENT_TYPES.includes(mimeType)) {
    throw new RequestValidationError('The attachment must be an image or a PDF');
  }
  const data = Buffer.from(match[2], 'base64');
  if (data.length === 0) throw new RequestValidationError('The attachment is empty');
  if (data.length > MAX_ATTACHMENT_BYTES) throw new RequestValidationError('The attachment must be 3MB or smaller');

  return [{ fieldName: type.attachment.field, fileName, mimeType, data }];
}

/* Every id must be an active member of the request's port. */
async function parseAssignees(raw: unknown, type: RequestTypeDef): Promise<number[]> {
  if (!Array.isArray(raw) || raw.length === 0 || !raw.every((id) => Number.isInteger(id))) {
    throw new RequestValidationError('Choose at least one person to assign');
  }
  const ids = [...new Set(raw as number[])];
  const portMembers = new Set(await dbGetPortMemberIds(type.targetPort));
  if (ids.some((id) => !portMembers.has(id))) {
    throw new RequestValidationError('Every assignee must be an active member of the port');
  }
  return ids;
}

function parseText(raw: unknown, what: string, required: boolean): string | null {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) {
    if (required) throw new RequestValidationError(`${what} is required`);
    return null;
  }
  if (text.length > MAX_TEXT_LENGTH) throw new RequestValidationError(`${what} must be ${MAX_TEXT_LENGTH} characters or fewer`);
  return text;
}

/**
 * Accepts a pending request. For an assignable type, the chosen port
 * members get one shared task for it (and a notification); a grievance
 * stays with the executive who accepted it. The requester is told either way.
 */
export async function acceptRequest(
  userId: number,
  requestId: number,
  input: { assigneeIds?: unknown; notes?: unknown }
): Promise<Request> {
  const { viewer, record, type } = await loadActionable(userId, requestId);
  const notes = parseText(input.notes, 'Notes', false);

  let task = null;
  if (type.assignable) {
    const assigneeIds = await parseAssignees(input.assigneeIds, type);
    const from = toView(record, viewer, type).requesterName ?? 'Anonymous';
    task = {
      title: record.title,
      description: [`${type.label} from ${from}.`, notes].filter(Boolean).join('\n\n'),
      dueDate: record.neededBy,
      assigneeIds,
    };
  } else if (Array.isArray(input.assigneeIds) && input.assigneeIds.length > 0) {
    throw new RequestValidationError(`A ${type.label.toLowerCase()} can't be assigned to others`);
  }

  const accepted = await dbAcceptRequest({ requestId, handledBy: viewer.id, notes, task });
  if (!accepted) throw new RequestNotFoundError('Request not found');

  if (accepted.taskId) {
    await notify(
      accepted.assignees.map((a) => a.id).filter((id) => id !== viewer.id),
      {
        type: 'task',
        taskId: accepted.taskId,
        title: `New task assigned: ${accepted.title}`,
        message: accepted.neededBy ? `Due ${new Date(accepted.neededBy).toLocaleDateString()}` : undefined,
      }
    );
  }
  await notifyRequester(accepted, viewer.id, type, 'was accepted');

  return toView(accepted, viewer, type);
}

/** Changes who's on an accepted request's task, notifying anyone newly added. */
export async function updateRequestAssignees(
  userId: number,
  requestId: number,
  input: { assigneeIds?: unknown }
): Promise<Request> {
  const { viewer, record, type } = await loadActionable(userId, requestId);
  if (!type.assignable) throw new RequestValidationError(`A ${type.label.toLowerCase()} can't be assigned to others`);
  if (record.status !== 'in_progress' || !record.taskId) {
    throw new RequestValidationError('Only an accepted, in-progress request can be reassigned');
  }

  const assigneeIds = await parseAssignees(input.assigneeIds, type);
  await dbSetTaskAssignees(record.taskId, assigneeIds);

  const before = new Set(record.assignees.map((a) => a.id));
  await notify(
    assigneeIds.filter((id) => !before.has(id) && id !== viewer.id),
    { type: 'task', taskId: record.taskId, title: `New task assigned: ${record.title}` }
  );

  const updated = await dbGetRequestById(requestId);
  if (!updated) throw new RequestNotFoundError('Request not found');
  return toView(updated, viewer, type);
}

/** Rejects a pending or in-progress request with a reason for the requester. */
export async function rejectRequest(userId: number, requestId: number, input: { reason?: unknown }): Promise<Request> {
  const { viewer, record, type } = await loadActionable(userId, requestId);
  const reason = parseText(input.reason, 'A reason', true) as string;

  const rejected = await dbRejectRequest(requestId, viewer.id, reason);
  if (!rejected) throw new RequestNotFoundError('Request not found');

  // Its task was just cancelled, so the people on it hear why it vanished.
  if (record.taskId) {
    await notify(
      record.assignees.map((a) => a.id).filter((id) => id !== viewer.id),
      { type: 'task', taskId: record.taskId, title: `Task cancelled: ${record.title}`, message: 'The request was rejected.' }
    );
  }
  await notifyRequester(rejected, viewer.id, type, 'was rejected', reason);

  return toView(rejected, viewer, type);
}

/** Completes an in-progress request, and its task with it. */
export async function completeRequest(userId: number, requestId: number): Promise<Request> {
  const { viewer, type } = await loadActionable(userId, requestId);
  const completed = await dbCompleteRequest(requestId);
  if (!completed) throw new RequestNotFoundError('Request not found');
  await notifyRequester(completed, viewer.id, type, 'is complete');
  return toView(completed, viewer, type);
}

/** An attachment's file, for anyone who can see its request. */
export async function getRequestAttachment(userId: number, requestId: number, attachmentId: number) {
  const viewer = await getViewer(userId);
  const record = await dbGetRequestById(requestId);
  const type = record ? getRequestType(record.requestType) : null;
  if (!record || !canView(viewer, record, type)) throw new RequestNotFoundError('Request not found');
  const attachment = await dbGetRequestAttachment(requestId, attachmentId);
  if (!attachment) throw new RequestNotFoundError('Attachment not found');
  return attachment;
}

async function notifyRequester(
  record: RequestRecord,
  actorId: number,
  type: RequestTypeDef,
  outcome: string,
  message?: string
): Promise<void> {
  if (!record.requesterId || record.requesterId === actorId) return;
  await notify([record.requesterId], {
    type: 'request',
    requestId: record.id,
    title: `Your ${type.label.toLowerCase()} ${outcome}: ${record.title}`,
    message,
  });
}

/* Best-effort, like every other notification: a failure is logged inside
   createNotificationsBulk and never undoes the action itself. */
async function notify(userIds: number[], notification: Omit<CreateNotificationInput, 'userId'>): Promise<void> {
  if (userIds.length === 0) return;
  await createNotificationsBulk(userIds.map((userId) => ({ ...notification, userId })));
}
