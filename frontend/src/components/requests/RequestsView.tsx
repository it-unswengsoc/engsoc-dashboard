'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Clock, Inbox, Plus, Send, X } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import { portLabel } from '@/lib/ports';
import type { Member, RequestDetail, RequestStatus } from '@/types/requests';

interface RequestsViewProps {
  requests: RequestDetail[];
  /* The pool the assignee picker draws from. Stands in for
     GET /users?port=… — no endpoint returns one yet. */
  members: Member[];
  currentUser: Member;
  /* Which port's queue this is. Hardcoded upstream for now — getProfile
     doesn't return users.port, so there's nothing to read it from. */
  port: string;
}

type Tab = 'inbox' | 'mine';
type Filter = RequestStatus | 'ALL';

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
];

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: 'bg-[#F4EFD3] text-gray-700',
  in_progress: 'bg-[#B1C9DC] text-gray-700',
  approved: 'bg-[#B1C9DC] text-gray-700',
  completed: 'bg-gray-100 text-gray-500',
  rejected: 'bg-[#F1C4C9] text-[#8B2E38]',
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  approved: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
};

/* Status on the row itself, so the list reads without clicking through. */
const STATUS_DOTS: Record<RequestStatus, string> = {
  pending: 'bg-[#E8C84A]',
  in_progress: 'bg-[#3D6C94]',
  approved: 'bg-[#3D6C94]',
  completed: 'bg-gray-300',
  rejected: 'bg-[#ED6672]',
};

const STATUS_STRIPS: Record<RequestStatus, string> = {
  pending: 'bg-[#F4EFD3]',
  in_progress: 'bg-[#B1C9DC]',
  approved: 'bg-[#B1C9DC]',
  completed: 'bg-gray-200',
  rejected: 'bg-[#F1C4C9]',
};

/* Same urgency vocabulary as the dashboard's task rows: red once it's on top
   of you, cream inside a week, blue while there's room. */
function dueBadge(iso?: string): { label: string; styles: string } | null {
  if (!iso) return null;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);

  if (days < 0) return { label: 'Overdue', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  if (days === 0) return { label: 'Due today', styles: 'bg-[#F1C4C9] text-[#8B2E38]' };
  if (days < 7) {
    return { label: `${days} ${days === 1 ? 'day' : 'days'}`, styles: 'bg-[#F4EFD3] text-gray-700' };
  }

  const weeks = Math.floor(days / 7);
  return { label: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`, styles: 'bg-[#B1C9DC] text-gray-700' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const inputStyles =
  'w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]';

export default function RequestsView({ requests, members, currentUser, port }: RequestsViewProps) {
  const [tab, setTab] = useState<Tab>('inbox');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* Accepting, assigning and rejecting live in local state: no
     PATCH /requests/:id exists, so nothing here survives a refresh. */
  const [board, setBoard] = useState(requests);

  /* 'accept' also moves the request to in_progress; 'edit' just changes who
     is on it. Same dialog either way. */
  const [assigning, setAssigning] = useState<'accept' | 'edit' | null>(null);
  const [draftAssignees, setDraftAssignees] = useState<Member[]>([]);
  const [draftNotes, setDraftNotes] = useState('');

  const [rejecting, setRejecting] = useState(false);
  const [draftReason, setDraftReason] = useState('');

  /* Your own submissions sit in "My requests", not in the queue you action. */
  const streams = useMemo(
    () => ({
      inbox: board.filter((r) => r.targetPort === port && r.requesterId !== currentUser.id),
      mine: board.filter((r) => r.requesterId === currentUser.id),
    }),
    [board, port, currentUser.id],
  );

  const stream = streams[tab];
  const visible = filter === 'ALL' ? stream : stream.filter((r) => r.status === filter);

  /* Selection follows the filter: if the selected request is filtered out,
     fall back to the first one still on screen. */
  const selected = visible.find((r) => r.id === selectedId) ?? visible[0] ?? null;

  const pendingCount = stream.filter((r) => r.status === 'pending').length;
  const overdueCount = stream.filter(
    (r) =>
      r.status !== 'completed' &&
      r.status !== 'rejected' &&
      dueBadge(r.neededBy)?.label === 'Overdue',
  ).length;

  function update(id: number, patch: Partial<RequestDetail>) {
    setBoard((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function openAssign(request: RequestDetail, mode: 'accept' | 'edit') {
    setDraftAssignees(request.assignedTo);
    setDraftNotes(request.notes ?? '');
    setAssigning(mode);
  }

  function confirmAssign() {
    if (!selected) return;
    update(selected.id, {
      assignedTo: draftAssignees,
      notes: draftNotes.trim() || undefined,
      ...(assigning === 'accept' ? { status: 'in_progress' as RequestStatus } : {}),
    });
    setAssigning(null);
  }

  function openReject(request: RequestDetail) {
    setDraftReason(request.rejectionReason ?? '');
    setRejecting(true);
  }

  function confirmReject() {
    if (!selected) return;
    update(selected.id, { status: 'rejected', rejectionReason: draftReason.trim() || undefined });
    setRejecting(false);
  }

  function toggleDraft(member: Member) {
    setDraftAssignees((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member],
    );
  }

  const canAction = tab === 'inbox';

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Inbox className="h-7 w-7 text-gray-900" strokeWidth={2} />
          <h1 className="text-3xl font-bold leading-none text-gray-900">Requests</h1>
          {/* leading-none on both so items-center aligns the glyphs rather than
              the line boxes — a 3xl heading's half-leading throws it off. */}
          <span className="rounded-full bg-[#B1C9DC]/30 px-3.5 py-1.5 font-mono text-xs font-bold uppercase leading-none tracking-wide text-[#3D6C94]">
            {portLabel(port)}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {overdueCount > 0 && (
            <span className="flex items-center gap-2 rounded-xl bg-[#F1C4C9] px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wide text-[#8B2E38]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {overdueCount} overdue
            </span>
          )}
          <span className="flex items-center gap-2 rounded-xl bg-[#F4EFD3] px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wide text-gray-700">
            <Clock className="h-4 w-4 shrink-0" />
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* STREAM TABS */}
      <div className="mt-5 flex gap-1 border-b border-gray-200">
        {([
          { value: 'inbox' as Tab, label: 'To action', icon: Inbox, count: streams.inbox.length },
          { value: 'mine' as Tab, label: 'My requests', icon: Send, count: streams.mine.length },
        ]).map(({ value, label, icon: Icon, count }) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setSelectedId(null);
              setFilter('ALL');
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === value
                ? 'border-[#3D6C94] text-[#3D6C94]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                tab === value ? 'bg-[#B1C9DC]/30 text-[#3D6C94]' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* STATUS FILTERS */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              filter === f.value
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-gray-200 bg-white px-4 py-16 text-center font-mono text-xs text-gray-400 shadow-sm">
          Nothing here.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[20rem_1fr]">
          {/* LIST — runs to the bottom of the viewport and scrolls inside,
              so the accent strip stays put while the rows move. */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:h-[calc(100vh-19rem)]">
            <div className="h-2 shrink-0 bg-[#B1C9DC]" />
            <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
              {visible.map((request) => {
                const isSelected = selected?.id === request.id;
                const due = dueBadge(request.neededBy);

                return (
                  <button
                    key={request.id}
                    onClick={() => setSelectedId(request.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#B1C9DC]/20 shadow-[inset_3px_0_0_#3D6C94]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[request.status]}`}
                        />
                        <span className="truncate text-sm font-bold text-gray-900">
                          {request.title}
                        </span>
                      </span>
                      <span className="truncate pl-4 font-mono text-[11px] text-gray-400">
                        {tab === 'mine' ? `to ${portLabel(request.targetPort)}` : request.typeLabel}
                      </span>
                    </span>

                    {due && (
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${due.styles}`}
                        >
                          {due.label}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {formatDate(request.neededBy!)}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DETAIL */}
          {selected && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className={`h-2 ${STATUS_STRIPS[selected.status]}`} />

              <div className="flex flex-wrap items-start justify-between gap-3 px-6 py-5">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                  <p className="mt-1 font-mono text-xs text-gray-400">
                    {selected.typeLabel} · submitted {formatDate(selected.submittedAt)}{' '}
                    {tab === 'mine'
                      ? `to ${portLabel(selected.targetPort)}`
                      : `by ${selected.requesterName}`}
                  </p>
                </div>
                <span
                  className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[selected.status]}`}
                >
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>

              {/* WHY IT WAS TURNED DOWN */}
              {selected.status === 'rejected' && selected.rejectionReason && (
                <div className="border-t border-gray-200 bg-[#F1C4C9]/25 px-6 py-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-[#8B2E38]">
                    Reason
                  </span>
                  <p className="mt-1 text-sm text-gray-800">{selected.rejectionReason}</p>
                </div>
              )}

              {/* WHO'S ON IT — each assignee becomes a task row carrying this
                  request's id, so the work lands in their My tasks. */}
              {(selected.status === 'in_progress' ||
                selected.status === 'approved' ||
                selected.status === 'completed') && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Assigned to
                    </span>

                    {selected.assignedTo.length === 0 && (
                      <span className="font-mono text-xs text-gray-400">No one yet</span>
                    )}

                    {selected.assignedTo.map((member) => (
                      <span
                        key={member.id}
                        className="flex items-center gap-1.5 rounded-full bg-[#B1C9DC]/30 py-0.5 pl-1 pr-2.5 text-xs font-bold text-gray-700"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B1C9DC] font-mono text-[9px] text-white">
                          {initials(member.name)}
                        </span>
                        {member.id === currentUser.id ? 'You' : member.name}
                      </span>
                    ))}

                    {canAction && selected.status !== 'completed' && (
                      <button
                        onClick={() => openAssign(selected, 'edit')}
                        className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-bold text-gray-500 transition-colors hover:border-[#B1C9DC] hover:text-[#3D6C94]"
                      >
                        <Plus className="h-3 w-3" />
                        Edit
                      </button>
                    )}
                  </div>

                  {selected.notes && (
                    <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      {selected.notes}
                    </p>
                  )}
                </div>
              )}

              <dl className="border-t border-gray-200 py-2">
                {selected.answers.map((answer) => (
                  <div
                    key={answer.label}
                    className="grid gap-1 px-6 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"
                  >
                    <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      {answer.label}
                    </dt>
                    <dd className="text-sm leading-relaxed text-gray-900">{answer.value}</dd>
                  </div>
                ))}
              </dl>

              {/* TODO: PATCH /requests/:id for status, handled_by and the
                  rejection reason, plus a task row per assignee carrying
                  request_id. Local state only today. */}
              {canAction && (
                <div className="flex flex-wrap gap-3 border-t border-gray-200 px-6 py-4">
                  {selected.status === 'pending' && (
                    <button
                      onClick={() => openAssign(selected, 'accept')}
                      className="rounded-xl bg-[#B1C9DC] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98]"
                    >
                      Accept
                    </button>
                  )}

                  {selected.status === 'in_progress' && (
                    <button
                      onClick={() => update(selected.id, { status: 'completed' })}
                      disabled={selected.assignedTo.length === 0}
                      className="rounded-xl bg-[#B1C9DC] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#B1C9DC] disabled:hover:shadow-sm disabled:active:scale-100"
                    >
                      Mark complete
                    </button>
                  )}

                  {/* Still rejectable after accepting — work gets called off
                      once underway as often as it gets turned down up front. */}
                  {(selected.status === 'pending' || selected.status === 'in_progress') && (
                    <button
                      onClick={() => openReject(selected)}
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Reject
                    </button>
                  )}

                  {(selected.status === 'completed' || selected.status === 'rejected') && (
                    <button
                      onClick={() =>
                        update(selected.id, {
                          status: 'pending',
                          assignedTo: [],
                          notes: undefined,
                          rejectionReason: undefined,
                        })
                      }
                      className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ACCEPT / REASSIGN */}
      {selected && assigning && (
        <Dialog
          open
          title={assigning === 'accept' ? `Accept “${selected.title}”` : 'Who’s on it'}
          onClose={() => setAssigning(null)}
        >
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Assign to
              </span>

              <div className="grid gap-1 sm:grid-cols-2">
                {members.map((member) => {
                  const isOn = draftAssignees.some((m) => m.id === member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleDraft(member)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isOn
                          ? 'bg-[#B1C9DC]/20 font-bold text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#B1C9DC] font-mono text-[9px] text-white">
                          {initials(member.name)}
                        </span>
                        {member.id === currentUser.id ? `${member.name} (you)` : member.name}
                      </span>
                      {isOn && <Check className="h-4 w-4 shrink-0 text-[#3D6C94]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Notes
              </span>
              <textarea
                rows={3}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="Anything whoever picks this up should know"
                className={`${inputStyles} resize-none`}
              />
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAssigning(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAssign}
                disabled={draftAssignees.length === 0}
                className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#B1C9DC] disabled:hover:shadow-sm disabled:active:scale-100"
              >
                {assigning === 'accept' ? 'Accept' : 'Save'}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* REJECT */}
      {selected && rejecting && (
        <Dialog open title={`Reject “${selected.title}”`} onClose={() => setRejecting(false)}>
          <div className="mt-6 flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Why <span className="text-[#ED6672]">*</span>
              </span>
              <textarea
                rows={3}
                value={draftReason}
                onChange={(e) => setDraftReason(e.target.value)}
                placeholder="The requester sees this, so say enough for them to act on"
                className={`${inputStyles} resize-none`}
              />
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejecting(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={draftReason.trim() === ''}
                className="flex-1 rounded-xl bg-[#ED6672] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#d95a66] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#ED6672] disabled:hover:shadow-sm disabled:active:scale-100"
              >
                Reject
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
