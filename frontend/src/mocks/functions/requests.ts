import type { RequestDetail, RequestsData } from '@/types/requests';
import { mockRequests, type MockRequestSeed } from '@/mocks/data/requests';
import { mockMembers } from '@/mocks/data/members';
import { mockProfile } from '@/mocks/data/auth';
import { requestForm, toAnswers } from '@/lib/request-forms';

/* Mirrors backend functions/request-types.ts closely enough for mock mode:
   where each type is filed, and whether it's assigned out. */
const TYPES: Record<string, { targetPort: string; assignable: boolean; approverTask: boolean }> = {
  marketing: { targetPort: 'marketing', assignable: true, approverTask: false },
  mass_email: { targetPort: 'IT', assignable: true, approverTask: false },
  event_photos: { targetPort: 'publication', assignable: true, approverTask: false },
  multimedia: { targetPort: 'publication', assignable: true, approverTask: false },
  reimbursement: { targetPort: 'cabinet', assignable: false, approverTask: true },
  grievance: { targetPort: 'HR', assignable: false, approverTask: false },
};

/* The mock viewer is an admin, who handles everything but grievances. */
const HANDLES = Object.keys(TYPES).filter((type) => type !== 'grievance');

function fromSeed(seed: MockRequestSeed): RequestDetail {
  return {
    id: seed.id,
    requestType: seed.requestType,
    title: seed.title,
    targetPort: seed.targetPort,
    formData: {},
    status: seed.status,
    isAnonymous: false,
    neededBy: seed.neededBy ?? null,
    notes: seed.notes ?? null,
    rejectionReason: seed.rejectionReason ?? null,
    requesterId: seed.requesterId,
    requesterName: seed.requesterName,
    requesterPort: seed.requesterPort,
    handledBy: seed.status === 'pending' ? null : mockProfile.id,
    handledByName: null,
    taskId: seed.assignedTo.length > 0 ? 1000 + seed.id : null,
    assignees: seed.assignedTo,
    attachments: [],
    createdAt: seed.submittedAt,
    updatedAt: seed.submittedAt,
    resolvedAt: null,
    canAction: HANDLES.includes(seed.requestType),
    assignable: TYPES[seed.requestType]?.assignable ?? false,
    approverTask: TYPES[seed.requestType]?.approverTask ?? false,
    typeLabel: seed.typeLabel,
    answers: seed.answers,
  };
}

/* In memory, so actions stick until a reload. */
let store: RequestDetail[] | null = null;
function requests(): RequestDetail[] {
  if (!store) store = mockRequests.map(fromSeed);
  return store;
}

function save(id: number, patch: Partial<RequestDetail>): RequestDetail {
  const list = requests();
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) throw new Error('Request not found');
  list[index] = { ...list[index], ...patch, updatedAt: new Date().toISOString() };
  return list[index];
}

export async function getRequests(): Promise<RequestsData> {
  const list = requests();
  return {
    incoming: list.filter((r) => HANDLES.includes(r.requestType)),
    mine: list.filter((r) => r.requesterId === mockProfile.id),
    handles: HANDLES,
  };
}

export async function submitRequest(
  requestType: string,
  title: string | undefined,
  formData: Record<string, unknown>,
  attachments: { fieldName: string; fileName: string; dataUri: string }[]
): Promise<RequestDetail> {
  const type = TYPES[requestType];
  if (!type) throw new Error('Unknown request type');
  const resolvedTitle = (title ?? (typeof formData.eventName === 'string' ? formData.eventName : '')).trim();
  if (!resolvedTitle) throw new Error('Title is required');

  const now = new Date().toISOString();
  const created: RequestDetail = {
    id: Math.max(0, ...requests().map((r) => r.id)) + 1,
    requestType,
    title: resolvedTitle,
    targetPort: type.targetPort,
    formData,
    status: 'pending',
    isAnonymous: requestType === 'grievance' && formData.anonymous === true,
    neededBy: null,
    notes: null,
    rejectionReason: null,
    requesterId: mockProfile.id,
    requesterName: `${mockProfile.firstName} ${mockProfile.lastName}`,
    requesterPort: mockProfile.port,
    handledBy: null,
    handledByName: null,
    taskId: null,
    assignees: [],
    attachments: attachments.map((a, i) => ({ id: i + 1, fieldName: a.fieldName, fileName: a.fileName, mimeType: '', sizeBytes: 0 })),
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    canAction: HANDLES.includes(requestType),
    assignable: type.assignable,
    approverTask: type.approverTask,
    typeLabel: requestForm(requestType)?.label ?? requestType,
    answers: toAnswers(requestType, formData),
  };
  requests().unshift(created);
  return created;
}

function membersById(ids: number[]) {
  return mockMembers.filter((m) => ids.includes(m.id));
}

export async function acceptRequest(requestId: number, input: { assigneeIds?: number[]; notes?: string }): Promise<RequestDetail> {
  const current = requests().find((r) => r.id === requestId);
  if (current?.status !== 'pending') throw new Error('Only a pending request can be accepted');
  const assignable = current.assignable;
  const me = { id: mockProfile.id, name: `${mockProfile.firstName} ${mockProfile.lastName}`, port: mockProfile.port };
  const assignees = assignable ? membersById(input.assigneeIds ?? []) : current.approverTask ? [me] : [];
  if (assignable && assignees.length === 0) throw new Error('Choose at least one person to assign');
  return save(requestId, {
    status: 'in_progress',
    notes: input.notes?.trim() || null,
    assignees,
    taskId: assignees.length > 0 ? 1000 + requestId : null,
    handledBy: mockProfile.id,
  });
}

export async function updateRequestAssignees(requestId: number, assigneeIds: number[]): Promise<RequestDetail> {
  return save(requestId, { assignees: membersById(assigneeIds) });
}

export async function rejectRequest(requestId: number, reason: string): Promise<RequestDetail> {
  return save(requestId, { status: 'rejected', rejectionReason: reason, resolvedAt: new Date().toISOString() });
}

export async function completeRequest(requestId: number): Promise<RequestDetail> {
  return save(requestId, { status: 'completed', resolvedAt: new Date().toISOString() });
}
