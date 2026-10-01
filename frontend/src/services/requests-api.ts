import type { Member, RequestAttachment, RequestDetail, RequestItem, RequestsData } from '@/types/requests';
import type { FieldPayload } from '@/components/dialogs/FormDialog';
import { apiUrl } from '@/services/api-config';
import { getDirectory } from '@/services/users-api';
import { requestForm, toAnswers } from '@/lib/request-forms';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export type { Member, RequestDetail, RequestsData };

/* Adds what the page shows on top of what the backend sends: the type's
   label, and the stored answers under their questions. */
function toDetail(item: RequestItem): RequestDetail {
  return {
    ...item,
    typeLabel: requestForm(item.requestType)?.label ?? item.requestType,
    answers: toAnswers(item.requestType, item.formData),
  };
}

async function send<T>(token: string, path: string, method: string, body: unknown, fallback: string): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || fallback);
  return data.data as T;
}

/* The viewer's incoming requests (if they handle any type) and their own. */
export async function getRequests(token: string): Promise<RequestsData> {
  if (USE_MOCK) {
    const { getRequests: mockGetRequests } = await import('@/mocks/functions/requests');
    return mockGetRequests();
  }

  const res = await fetch(apiUrl('/requests'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to load requests');
  const raw = data.data as { incoming: RequestItem[]; mine: RequestItem[]; handles: string[] };
  // `?? []`: a backend from before `handles` existed (only while a deploy rolls out).
  return { incoming: raw.incoming.map(toDetail), mine: raw.mine.map(toDetail), handles: raw.handles ?? [] };
}

/* A file field's value arrives from FormDialog as a data: URI with no name
   attached, so the file is named after the field and its type. */
function fileNameFor(field: string, dataUri: string): string {
  const mime = /^data:([^;,]+)/.exec(dataUri)?.[1] ?? '';
  const extension = mime === 'application/pdf' ? 'pdf' : mime.startsWith('image/') ? mime.slice(6).replace('jpeg', 'jpg') : 'bin';
  return `${field}.${extension}`;
}

/**
 * Submits one of the request forms. File fields travel separately as
 * attachments; everything else is the form's answers. The backend decides
 * where it goes from `requestType` alone.
 */
export async function submitRequest(token: string, requestType: string, payload: FieldPayload): Promise<RequestDetail> {
  const form = requestForm(requestType);
  const fileFields = new Set(form?.fields.filter((f) => f.kind === 'file').map((f) => f.name) ?? []);

  const formData: Record<string, unknown> = {};
  const attachments: { fieldName: string; fileName: string; dataUri: string }[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (fileFields.has(key) && typeof value === 'string') {
      attachments.push({ fieldName: key, fileName: fileNameFor(key, value), dataUri: value });
    } else {
      formData[key] = value;
    }
  }
  const title = typeof payload.title === 'string' ? payload.title : undefined;

  if (USE_MOCK) {
    const { submitRequest: mockSubmit } = await import('@/mocks/functions/requests');
    return mockSubmit(requestType, title, formData, attachments);
  }

  const created = await send<RequestItem>(token, '/requests', 'POST', { requestType, title, formData, attachments }, 'Failed to submit request');
  return toDetail(created);
}

/* Accepts a pending request. `assigneeIds` is left out for a type that isn't
   assigned out (grievances, reimbursements). */
export async function acceptRequest(
  token: string,
  requestId: number,
  input: { assigneeIds?: number[]; notes?: string }
): Promise<RequestDetail> {
  if (USE_MOCK) {
    const { acceptRequest: mockAccept } = await import('@/mocks/functions/requests');
    return mockAccept(requestId, input);
  }
  return toDetail(await send<RequestItem>(token, `/requests/${requestId}/accept`, 'POST', input, 'Failed to accept request'));
}

export async function updateRequestAssignees(token: string, requestId: number, assigneeIds: number[]): Promise<RequestDetail> {
  if (USE_MOCK) {
    const { updateRequestAssignees: mockUpdate } = await import('@/mocks/functions/requests');
    return mockUpdate(requestId, assigneeIds);
  }
  return toDetail(
    await send<RequestItem>(token, `/requests/${requestId}/assignees`, 'PUT', { assigneeIds }, 'Failed to update assignees')
  );
}

export async function rejectRequest(token: string, requestId: number, reason: string): Promise<RequestDetail> {
  if (USE_MOCK) {
    const { rejectRequest: mockReject } = await import('@/mocks/functions/requests');
    return mockReject(requestId, reason);
  }
  return toDetail(await send<RequestItem>(token, `/requests/${requestId}/reject`, 'POST', { reason }, 'Failed to reject request'));
}

export async function completeRequest(token: string, requestId: number): Promise<RequestDetail> {
  if (USE_MOCK) {
    const { completeRequest: mockComplete } = await import('@/mocks/functions/requests');
    return mockComplete(requestId);
  }
  return toDetail(await send<RequestItem>(token, `/requests/${requestId}/complete`, 'POST', undefined, 'Failed to complete request'));
}

/* Downloads an attachment (a receipt). Fetched with the token rather than
   linked, since the route sits behind auth like the request itself. */
export async function downloadRequestAttachment(token: string, requestId: number, attachment: RequestAttachment): Promise<void> {
  if (USE_MOCK) throw new Error('Attachments are not available in mock mode');

  const res = await fetch(apiUrl(`/requests/${requestId}/attachments/${attachment.id}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to download file');
  }
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/* Who a request can be assigned to: anyone active in its port. */
export async function getPortMembers(token: string, port: string): Promise<Member[]> {
  if (USE_MOCK) {
    const { getMembers: mockGetMembers } = await import('@/mocks/functions/members');
    return (await mockGetMembers()).filter((member) => member.port === port);
  }
  const directory = await getDirectory(token);
  return directory
    .filter((user) => user.port === port)
    .map((user) => ({ id: user.id, name: `${user.firstName} ${user.lastName}`, port: user.port }));
}
