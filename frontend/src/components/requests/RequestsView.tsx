'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Clock, Download, ExternalLink, Inbox, Link2, Paperclip, Plus, Send } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import { portLabel } from '@/lib/ports';
import {
  acceptRequest,
  completeRequest,
  downloadRequestAttachment,
  getPortMembers,
  rejectRequest,
  updateRequestAssignees,
} from '@/services/requests-api';
import type { Member, RequestDetail, RequestsData, RequestStatus } from '@/types/requests';

interface RequestsViewProps {
  data: RequestsData;
  currentUserId: number;
  /* The viewer's own port, for the header badge. */
  port: string | null;
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
function dueBadge(iso: string | null): { label: string; styles: string } | null {
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

function readToken(): string {
  const token = sessionStorage.getItem('token');
  if (!token) throw new Error('You are signed out — sign in again');
  return token;
}

export default function RequestsView({ data, currentUserId, port }: RequestsViewProps) {
  /* Only people who handle a request type get the incoming list at all. */
  const handlesAny = data.handles.length > 0;
  const [tab, setTab] = useState<Tab>(handlesAny ? 'inbox' : 'mine');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* Each action answers with the updated request, which replaces its copy
     here; a fresh load from the page replaces them all. */
  const [incoming, setIncoming] = useState(data.incoming);
  const [mine, setMine] = useState(data.mine);
  useEffect(() => {
    setIncoming(data.incoming);
    setMine(data.mine);
  }, [data]);

  /* Who the assignee picker offers: active members of the request's port. */
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  /* People already on a request who are no longer active in its port, so
     can't stay on it — taken off the picker's selection, and named so the
     change isn't silent. */
  const [droppedAssignees, setDroppedAssignees] = useState<Member[]>([]);
  /* Only the latest member list may land: an admin can open requests from
     different ports one after another, and a slow earlier list would
     otherwise fill the later dialog with the wrong port's members. */
  const latestMembersLoad = useRef(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  /* 'accept' also moves the request to in_progress; 'edit' just changes who
     is on it. Same dialog either way. */
  const [assigning, setAssigning] = useState<'accept' | 'edit' | null>(null);
  const [draftAssignees, setDraftAssignees] = useState<Member[]>([]);
  const [draftNotes, setDraftNotes] = useState('');

  const [rejecting, setRejecting] = useState(false);
  const [draftReason, setDraftReason] = useState('');

  /* A request you handle stays in your queue even if you sent it — a
     director requesting work from their own port is one of the people who
     can pick it up — and is listed under "My requests" as well. */
  const streams = useMemo(() => ({ inbox: incoming, mine }), [incoming, mine]);

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

  function replace(updated: RequestDetail) {
    const swap = (list: RequestDetail[]) => list.map((r) => (r.id === updated.id ? updated : r));
    setIncoming(swap);
    setMine(swap);
  }

  /* Runs an action, swaps in the request it returns, and keeps any error
     on screen. Resolves true on success so a dialog knows to close. */
  async function run(action: (token: string) => Promise<RequestDetail>): Promise<boolean> {
    setBusy(true);
    setActionError('');
    try {
      replace(await action(readToken()));
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openAssign(request: RequestDetail, mode: 'accept' | 'edit') {
    setDraftAssignees(request.assignees);
    setDraftNotes(request.notes ?? '');
    setActionError('');
    setAssigning(mode);
    setDroppedAssignees([]);
    if (request.assignable) {
      const loadId = ++latestMembersLoad.current;
      setMembers([]);
      setMembersError('');
      setMembersLoading(true);
      getPortMembers(readToken(), request.targetPort)
        .then((list) => {
          if (loadId !== latestMembersLoad.current) return;
          setMembers(list);
          const available = new Set(list.map((m) => m.id));
          setDraftAssignees(request.assignees.filter((m) => available.has(m.id)));
          setDroppedAssignees(request.assignees.filter((m) => !available.has(m.id)));
        })
        .catch((err) => {
          if (loadId !== latestMembersLoad.current) return;
          setMembersError(err instanceof Error ? err.message : 'Failed to load members');
        })
        .finally(() => {
          if (loadId === latestMembersLoad.current) setMembersLoading(false);
        });
    }
  }

  async function confirmAssign() {
    if (!selected) return;
    const id = selected.id;
    const assigneeIds = draftAssignees.map((m) => m.id);
    const notes = draftNotes.trim() || undefined;
    const ok = await run((token) =>
      assigning === 'accept'
        ? acceptRequest(token, id, selected.assignable ? { assigneeIds, notes } : { notes })
        : updateRequestAssignees(token, id, assigneeIds),
    );
    if (ok) setAssigning(null);
  }

  function openReject(request: RequestDetail) {
    setDraftReason(request.rejectionReason ?? '');
    setActionError('');
    setRejecting(true);
  }

  async function confirmReject() {
    if (!selected) return;
    const id = selected.id;
    const reason = draftReason.trim();
    if (await run((token) => rejectRequest(token, id, reason))) setRejecting(false);
  }

  async function download(request: RequestDetail, attachment: RequestDetail['attachments'][number]) {
    setActionError('');
    try {
      await downloadRequestAttachment(readToken(), request.id, attachment);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to download file');
    }
  }

  function toggleDraft(member: Member) {
    setDraftAssignees((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member],
    );
  }

  const canAction = tab === 'inbox' && (selected?.canAction ?? false);

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Inbox className="h-7 w-7 text-gray-900" strokeWidth={2} />
          <h1 className="text-3xl font-bold leading-none text-gray-900">Requests</h1>
          {/* leading-none on both so items-center aligns the glyphs rather than
              the line boxes — a 3xl heading's half-leading throws it off. */}
          {port && (
            <span className="rounded-full bg-[#B1C9DC]/30 px-3.5 py-1.5 font-mono text-xs font-bold uppercase leading-none tracking-wide text-[#3D6C94]">
              {portLabel(port)}
            </span>
          )}
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
          ...(handlesAny ? [{ value: 'inbox' as Tab, label: 'To action', icon: Inbox, count: streams.inbox.length }] : []),
          { value: 'mine' as Tab, label: 'My requests', icon: Send, count: streams.mine.length },
        ]).map(({ value, label, icon: Icon, count }) => (
          <button
            key={value}
            onClick={() => {
              setTab(value);
              setSelectedId(null);
              setFilter('ALL');
              setActionError('');
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
                    onClick={() => {
                      setSelectedId(request.id);
                      setActionError('');
                    }}
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
                    {selected.typeLabel} · submitted {formatDate(selected.createdAt)}{' '}
                    {tab === 'mine'
                      ? `to ${portLabel(selected.targetPort)}`
                      : `by ${selected.requesterId === currentUserId ? 'you' : (selected.requesterName ?? 'Anonymous')}`}
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

              {/* WHO'S ON IT — accepting gave the assignees one shared task
                  carrying this request's id, so the work is in their My
                  tasks. A type that isn't assigned out shows who took it. */}
              {!selected.assignable && selected.status !== 'pending' && (selected.handledByName || selected.notes) && (
                <div className="border-t border-gray-200 px-6 py-4">
                  {selected.handledByName && (
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Handled by{' '}
                      <span className="normal-case tracking-normal text-gray-900">
                        {selected.handledBy === currentUserId ? 'You' : selected.handledByName}
                      </span>
                    </span>
                  )}
                  {selected.notes && (
                    <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{selected.notes}</p>
                  )}
                </div>
              )}

              {selected.assignable &&
                (selected.status === 'in_progress' ||
                selected.status === 'approved' ||
                selected.status === 'completed') && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Assigned to
                    </span>

                    {selected.assignees.length === 0 && (
                      <span className="font-mono text-xs text-gray-400">No one yet</span>
                    )}

                    {selected.assignees.map((member) => (
                      <span
                        key={member.id}
                        className="flex items-center gap-1.5 rounded-full bg-[#B1C9DC]/30 py-0.5 pl-1 pr-2.5 text-xs font-bold text-gray-700"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#B1C9DC] font-mono text-[9px] text-white">
                          {initials(member.name)}
                        </span>
                        {member.id === currentUserId ? 'You' : member.name}
                      </span>
                    ))}

                    {canAction && selected.status === 'in_progress' && (
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

              {/* Each question above its answer, full width — the form's
                  questions run long ("Date for mass emailing to be
                  released"), and squeezing them into a side column wrapped
                  them into three lines of capitals. Link answers gather
                  into buttons underneath. */}
              {(() => {
                const textAnswers = selected.answers.filter((answer) => !answer.link);
                const linkAnswers = selected.answers.filter((answer) => answer.link);
                return (
                  (textAnswers.length > 0 || linkAnswers.length > 0) && (
                    <div className="border-t border-gray-200 px-6 py-2">
                      {textAnswers.length > 0 && (
                        <dl className="divide-y divide-gray-100">
                          {textAnswers.map((answer) => (
                            <div key={answer.label} className="py-3">
                              <dt className="text-[13px] font-semibold text-gray-500">{answer.label}</dt>
                              <dd className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-gray-900">
                                {answer.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {linkAnswers.length > 0 && (
                        <div className={`py-3 ${textAnswers.length > 0 ? 'border-t border-gray-100' : ''}`}>
                          <span className="text-[13px] font-semibold text-gray-500">Links</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {linkAnswers.map((answer) => (
                              <a
                                key={answer.label}
                                href={answer.link!.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={answer.link!.href}
                                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-[#3D6C94] transition-colors hover:border-[#B1C9DC] hover:bg-[#B1C9DC]/10"
                              >
                                <Link2 className="h-4 w-4 shrink-0" />
                                {answer.link!.label}
                                <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                );
              })()}

              {selected.attachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 px-6 py-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Attachments</span>
                  {selected.attachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      onClick={() => download(selected, attachment)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700 transition-colors hover:border-[#B1C9DC] hover:text-[#3D6C94]"
                    >
                      <Paperclip className="h-3 w-3" />
                      {attachment.fileName}
                      <Download className="h-3 w-3 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}

              {actionError && !assigning && !rejecting && (
                <p role="alert" className="border-t border-gray-200 px-6 py-3 text-xs font-bold text-[#8B2E38]">
                  {actionError}
                </p>
              )}

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
                      onClick={() => {
                        const id = selected.id;
                        run((token) => completeRequest(token, id));
                      }}
                      disabled={busy || (selected.assignable && selected.assignees.length === 0)}
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
            {selected.assignable ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Assign to
              </span>

              {membersError ? (
                <p className="text-xs font-bold text-[#8B2E38]">{membersError}</p>
              ) : membersLoading ? (
                <p className="font-mono text-xs text-gray-400">Loading {portLabel(selected.targetPort)} members…</p>
              ) : (
                members.length === 0 && (
                  <p className="font-mono text-xs text-gray-400">
                    No active members in {portLabel(selected.targetPort)} to assign.
                  </p>
                )
              )}
              {droppedAssignees.length > 0 && (
                <p className="text-xs text-gray-500">
                  {droppedAssignees.map((m) => m.name).join(', ')}{' '}
                  {droppedAssignees.length === 1 ? 'is' : 'are'} no longer active in {portLabel(selected.targetPort)}, so
                  saving takes them off this request.
                </p>
              )}

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
                        {member.id === currentUserId ? `${member.name} (you)` : member.name}
                      </span>
                      {isOn && <Check className="h-4 w-4 shrink-0 text-[#3D6C94]" />}
                    </button>
                  );
                })}
              </div>
            </div>
            ) : (
              <p className="text-sm text-gray-600">
                {selected.approverTask
                  ? 'You’ll handle this one yourself — accepting adds it to your own tasks.'
                  : `You’ll handle this one yourself — ${selected.typeLabel.toLowerCase()}s aren’t assigned out or added to anyone’s tasks.`}
              </p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Notes
              </span>
              <textarea
                rows={3}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder={selected.assignable ? 'Anything whoever picks this up should know' : 'For your own reference'}
                className={`${inputStyles} resize-none`}
              />
            </label>

            {actionError && <p role="alert" className="text-xs font-bold text-[#8B2E38]">{actionError}</p>}

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
                disabled={busy || (selected.assignable && draftAssignees.length === 0)}
                className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#B1C9DC] disabled:hover:shadow-sm disabled:active:scale-100"
              >
                {busy ? 'Saving…' : assigning === 'accept' ? 'Accept' : 'Save'}
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

            {actionError && <p role="alert" className="text-xs font-bold text-[#8B2E38]">{actionError}</p>}

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
                disabled={busy || draftReason.trim() === ''}
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

/* Stands in for the page while the requests load: the real header, tab
   strip and filters, with placeholder rows and a blank detail pane. */
export function RequestsViewSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex items-center gap-2.5">
        <Inbox className="h-7 w-7 text-gray-900" strokeWidth={2} />
        <h1 className="text-3xl font-bold leading-none text-gray-900">Requests</h1>
      </div>

      <div className="mt-5 flex gap-2 border-b border-gray-200 pb-2.5">
        <span className="h-6 w-28 animate-pulse rounded bg-gray-100" />
        <span className="h-6 w-28 animate-pulse rounded bg-gray-100" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <span key={f.value} className="h-9 w-20 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[20rem_1fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-2 bg-[#B1C9DC]" />
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2 px-4 py-3">
                <span className="h-3.5 w-40 animate-pulse rounded bg-gray-100" />
                <span className="ml-4 h-2.5 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="h-2 bg-gray-100" />
          <div className="flex flex-col gap-3 px-6 py-5">
            <span className="h-5 w-56 animate-pulse rounded bg-gray-100" />
            <span className="h-3 w-40 animate-pulse rounded bg-gray-100" />
            <span className="mt-4 h-3 w-full animate-pulse rounded bg-gray-100" />
            <span className="h-3 w-5/6 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
