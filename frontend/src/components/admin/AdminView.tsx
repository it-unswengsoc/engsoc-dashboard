'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getProfile } from '@/services/auth-api';
import { getUsers, updateUser } from '@/services/admin-api';
import type { AdminUser, UserRole } from '@/types/admin';
import { ROLE_OPTIONS } from '@/lib/roles';
import { PORT_OPTIONS } from '@/lib/ports';
import Select from '@/components/dialogs/Select';

const PORT_SELECT_OPTIONS = [{ value: '', label: 'Unassigned' }, ...PORT_OPTIONS];

/* Per-row save state — a row saves itself the instant its role or port
   dropdown changes (no separate "Save" button), same as ticking off a task
   elsewhere in the dashboard. Errors surface inline on that row rather than
   as a page-level banner, since only one row's edit ever fails at a time. */
type RowState = { saving: boolean; error: string; justSaved: boolean };

/* Zachary Abran and Winnie Moy were made admins directly in the database to
   bootstrap this panel (see the one-off script run alongside this feature) —
   everyone after them gets promoted from here instead. */
export default function AdminView() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [rowState, setRowState] = useState<Record<number, RowState>>({});

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

  async function handleUpdate(userId: number, updates: { role?: UserRole; port?: string | null }) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setRowState((prev) => ({ ...prev, [userId]: { saving: true, error: '', justSaved: false } }));
    try {
      const updated = await updateUser(token, userId, updates);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setRowState((prev) => ({ ...prev, [userId]: { saving: false, error: '', justSaved: true } }));
      setTimeout(() => {
        setRowState((prev) =>
          prev[userId]?.justSaved ? { ...prev, [userId]: { ...prev[userId], justSaved: false } } : prev
        );
      }, 1500);
    } catch (err) {
      setRowState((prev) => ({
        ...prev,
        [userId]: { saving: false, error: err instanceof Error ? err.message : 'Failed to save', justSaved: false },
      }));
    }
  }

  if (checkingAccess || !authorized) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="h-7 w-7 text-gray-900" strokeWidth={2} />
        <h1 className="text-3xl font-bold text-gray-900">Admin</h1>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Manage member roles and portfolios. Changes save immediately and take effect on their next request.
      </p>

      <div className="mt-6 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 font-mono text-xs text-gray-400">Loading…</p>
        ) : loadError ? (
          <p className="p-6 font-mono text-xs text-[#8B2E38]">{loadError}</p>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-gray-100 bg-gray-50 px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-[#8A94A3]">
              <span>Member</span>
              <span>Role</span>
              <span>Portfolio</span>
              <span>Google</span>
              <span className="text-right">Last active</span>
            </div>

            {users.map((user) => {
              const state = rowState[user.id];
              const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

              return (
                <div key={user.id} className="border-b border-gray-100 last:border-0">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-6 py-3">
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
                      value={user.role}
                      options={ROLE_OPTIONS}
                      onChange={(role) => handleUpdate(user.id, { role: role as UserRole })}
                    />

                    <Select
                      value={user.port ?? ''}
                      options={PORT_SELECT_OPTIONS}
                      onChange={(port) => handleUpdate(user.id, { port: port === '' ? null : port })}
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
                      {state?.saving && <span>Saving…</span>}
                      {state?.justSaved && (
                        <CheckCircle2 className="h-4 w-4 text-[#2A7D6F]" aria-label="Saved" />
                      )}
                      {!state?.saving && !state?.justSaved && (
                        <span>{user.lastLogin ? formatLastActive(user.lastLogin) : 'Never'}</span>
                      )}
                    </div>
                  </div>

                  {state?.error && (
                    <p className="px-6 pb-2 font-mono text-xs text-[#8B2E38]">{state.error}</p>
                  )}
                </div>
              );
            })}
          </div>
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
