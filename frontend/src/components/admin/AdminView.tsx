'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Search, Undo2 } from 'lucide-react';
import { getProfile } from '@/services/auth-api';
import { getUsers, updateUser } from '@/services/admin-api';
import type { AdminUser, UserRole } from '@/types/admin';
import { ROLE_OPTIONS } from '@/lib/roles';
import { PORT_OPTIONS } from '@/lib/ports';
import Select from '@/components/dialogs/Select';

const PORT_SELECT_OPTIONS = [{ value: '', label: 'Unassigned' }, ...PORT_OPTIONS];

// Sentinel for the bulk-edit bar's "don't touch this field" state — distinct
// from '' (role has no such state; port's '' already means Unassigned, a
// real value, so it can't double as "leave it alone" too).
const NO_CHANGE = '__no_change__';
const BULK_ROLE_OPTIONS = [{ value: NO_CHANGE, label: '— No change —' }, ...ROLE_OPTIONS];
const BULK_PORT_OPTIONS = [{ value: NO_CHANGE, label: '— No change —' }, ...PORT_SELECT_OPTIONS];

// A staged, unsaved edit — only the fields actually changed from what's on
// the server. Nothing here is sent anywhere until "Confirm changes".
type PendingEdit = { role?: UserRole; port?: string | null };

/* Every edit here — from a single row's dropdown or the bulk-edit bar —
   only stages a change (see stage() below); nothing reaches the server
   until "Confirm changes" is clicked, so a misclick (especially on role,
   which can grant or revoke admin) is always reviewable and reversible
   before it takes effect.

   Zachary Abran and Winnie Moy were made admins directly in the database to
   bootstrap this panel — everyone after them gets promoted from here. */
export default function AdminView() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRole, setBulkRole] = useState(NO_CHANGE);
  const [bulkPort, setBulkPort] = useState(NO_CHANGE);

  const [pending, setPending] = useState<Record<number, PendingEdit>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [justSaved, setJustSaved] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    getProfile(token)
      .then((profile) => {
        if (profile.role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        setAuthorized(true);
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'Unauthorized') {
          sessionStorage.removeItem('token');
          router.push('/login');
        } else {
          router.replace('/dashboard');
        }
      })
      .finally(() => setCheckingAccess(false));
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    getUsers(token)
      .then(setUsers)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [authorized]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, users]);

  const allVisibleSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));
  const someVisibleSelected = filteredUsers.some((u) => selectedIds.has(u.id));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredUsers.forEach((u) => next.delete(u.id));
      } else {
        filteredUsers.forEach((u) => next.add(u.id));
      }
      return next;
    });
  }

  function toggleSelect(userId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  // Merges a patch into a user's staged edit, dropping the entry entirely
  // once it matches the user's actual saved values again — so toggling a
  // dropdown back to where it started clears the "unsaved" marker instead
  // of leaving a no-op change staged.
  function stage(userId: number, patch: PendingEdit) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setPending((prev) => {
      const merged = { ...prev[userId], ...patch };
      const roleMatches = merged.role === undefined || merged.role === user.role;
      const portMatches = merged.port === undefined || (merged.port ?? null) === (user.port ?? null);

      if (roleMatches && portMatches) {
        const { [userId]: _discard, ...rest } = prev;
        return rest;
      }
      return { ...prev, [userId]: merged };
    });
    setRowErrors((prev) => {
      if (!(userId in prev)) return prev;
      const { [userId]: _discard, ...rest } = prev;
      return rest;
    });
  }

  function discardRow(userId: number) {
    setPending((prev) => {
      const { [userId]: _discard, ...rest } = prev;
      return rest;
    });
    setRowErrors((prev) => {
      const { [userId]: _discard, ...rest } = prev;
      return rest;
    });
  }

  function discardAll() {
    setPending({});
    setRowErrors({});
  }

  function applyBulkToSelected() {
    if (bulkRole === NO_CHANGE && bulkPort === NO_CHANGE) return;
    const patch: PendingEdit = {};
    if (bulkRole !== NO_CHANGE) patch.role = bulkRole as UserRole;
    if (bulkPort !== NO_CHANGE) patch.port = bulkPort === '' ? null : bulkPort;

    selectedIds.forEach((id) => stage(id, patch));

    setSelectedIds(new Set());
    setBulkRole(NO_CHANGE);
    setBulkPort(NO_CHANGE);
  }

  async function confirmChanges() {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const ids = Object.keys(pending).map(Number);
    if (ids.length === 0) return;

    setConfirming(true);
    const results = await Promise.allSettled(ids.map((id) => updateUser(token, id, pending[id])));

    const succeededIds: number[] = [];
    const updatedUsers: AdminUser[] = [];
    const nextErrors: Record<number, string> = {};

    results.forEach((result, i) => {
      const id = ids[i];
      if (result.status === 'fulfilled') {
        succeededIds.push(id);
        updatedUsers.push(result.value);
      } else {
        nextErrors[id] = result.reason instanceof Error ? result.reason.message : 'Failed to save';
      }
    });

    if (updatedUsers.length > 0) {
      setUsers((prev) => prev.map((u) => updatedUsers.find((x) => x.id === u.id) ?? u));
      setPending((prev) => {
        const next = { ...prev };
        succeededIds.forEach((id) => delete next[id]);
        return next;
      });
      setJustSaved(new Set(succeededIds));
      setTimeout(() => setJustSaved(new Set()), 1500);
    }
    setRowErrors(nextErrors);
    setConfirming(false);
  }

  if (checkingAccess || !authorized) return null;

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="h-7 w-7 text-gray-900" strokeWidth={2} />
        <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Select one or more members, choose new values, then confirm to save — nothing changes until you do.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div className="relative max-w-sm">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members by name or email..."
            className="w-full rounded-lg border border-transparent bg-gray-100 py-2 pl-9 pr-4 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]"
          />
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#B1C9DC] bg-[#B1C9DC]/10 px-4 py-3">
            <span className="text-sm font-bold text-gray-900">{selectedIds.size} selected</span>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">Role</span>
              <div className="w-40">
                <Select value={bulkRole} options={BULK_ROLE_OPTIONS} onChange={setBulkRole} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">Portfolio</span>
              <div className="w-40">
                <Select value={bulkPort} options={BULK_PORT_OPTIONS} onChange={setBulkPort} />
              </div>
            </div>

            <button
              onClick={applyBulkToSelected}
              disabled={bulkRole === NO_CHANGE && bulkPort === NO_CHANGE}
              className="rounded-lg bg-[#B1C9DC] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stage for selected
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto rounded-lg px-2 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:bg-white"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 font-mono text-xs text-gray-400">Loading…</p>
        ) : loadError ? (
          <p className="p-6 font-mono text-xs text-[#8B2E38]">{loadError}</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-gray-100 bg-gray-50 px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-[#3D6C94]"
                  aria-label="Select all visible members"
                />
                <span>Member</span>
                <span>Role</span>
                <span>Portfolio</span>
                <span>Google</span>
                <span className="text-right">Status</span>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="p-6 font-mono text-xs text-gray-400">No members match &ldquo;{query}&rdquo;.</p>
              ) : (
                filteredUsers.map((user) => {
                  const edit = pending[user.id];
                  const isPending = edit !== undefined;
                  const rowError = rowErrors[user.id];
                  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

                  const roleValue = edit?.role ?? user.role;
                  const portValue = edit && edit.port !== undefined ? (edit.port ?? '') : (user.port ?? '');

                  return (
                    <div key={user.id} className={`border-b border-gray-100 last:border-0 ${isPending ? 'bg-[#F4EFD3]/40' : ''}`}>
                      <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelect(user.id)}
                          className="h-4 w-4 accent-[#3D6C94]"
                          aria-label={`Select ${user.firstName} ${user.lastName}`}
                        />

                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B1C9DC] text-xs font-bold text-white">
                            {initials || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="truncate font-mono text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>

                        <Select
                          value={roleValue}
                          options={ROLE_OPTIONS}
                          onChange={(role) => stage(user.id, { role: role as UserRole })}
                        />

                        <Select
                          value={portValue}
                          options={PORT_SELECT_OPTIONS}
                          onChange={(port) => stage(user.id, { port: port === '' ? null : port })}
                        />

                        <div>
                          {user.hasGoogleAccount ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-[#2A7D6F]/10 px-2 py-1 text-xs font-bold text-[#2A7D6F]">
                              Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-bold text-gray-400">
                              Not connected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 text-right font-mono text-xs text-gray-400">
                          {justSaved.has(user.id) ? (
                            <CheckCircle2 className="h-4 w-4 text-[#2A7D6F]" aria-label="Saved" />
                          ) : isPending ? (
                            <>
                              <span className="rounded-full bg-[#F4EFD3] px-2 py-0.5 font-bold text-[#7A6A2E]">Unsaved</span>
                              <button
                                onClick={() => discardRow(user.id)}
                                aria-label="Discard change"
                                className="text-gray-400 transition-colors hover:text-gray-700"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <span>{user.lastLogin ? formatLastActive(user.lastLogin) : 'Never'}</span>
                          )}
                        </div>
                      </div>

                      {rowError && <p className="px-6 pb-2 font-mono text-xs text-[#8B2E38]">{rowError}</p>}
                    </div>
                  );
                })
              )}
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-3">
                <span className="text-sm font-bold text-gray-900">
                  {pendingCount} unsaved {pendingCount === 1 ? 'change' : 'changes'}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={discardAll}
                    disabled={confirming}
                    className="rounded-xl border border-gray-200 px-5 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={confirmChanges}
                    disabled={confirming}
                    className="rounded-xl bg-[#B1C9DC] px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirming ? 'Saving…' : 'Confirm changes'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function formatLastActive(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString();
}
