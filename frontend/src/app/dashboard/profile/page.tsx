'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Mail } from 'lucide-react';
import { getProfile, updateProfile } from '@/services/auth-api';
import type { Profile } from '@/types/auth';

const inputStyles =
  'w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const token = sessionStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    getProfile(token)
      .then(setProfile)
      .catch((err) => {
        if (err.message === 'Unauthorized') {
          sessionStorage.removeItem('token');
          router.push('/login');
        } else {
          setError('Failed to load profile');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  function startEditing() {
    if (!profile) return;
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setSaveError('');
    setEditing(true);
  }

  /* Called both by the form's submit (Enter) and the Save button, which sits
     outside the form in the header row. */
  async function handleSave(e?: FormEvent) {
    e?.preventDefault();
    setSaveError('');

    /* The endpoint 400s on a blank name rather than clearing it. */
    if (!firstName.trim() || !lastName.trim()) {
      setSaveError('First and last name are both required.');
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProfile(token, firstName.trim(), lastName.trim());
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        sessionStorage.removeItem('token');
        router.push('/login');
        return;
      }
      setSaveError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('token');
    router.push('/login');
  }

  if (loading) return <p className="text-sm text-gray-500">Loading...</p>;

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-lg bg-[#F1C4C9]/50 px-3 py-2 text-sm font-medium text-[#8B2E38]"
      >
        {error}
      </p>
    );
  }

  if (!profile) return null;

  const initials = `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="h-28 bg-gradient-to-r from-[#B1C9DC] via-[#DCE8F1] to-[#F4EFD3]" />

      <div className="px-8 pb-8">
        <div className="flex items-center gap-4 py-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#B1C9DC] text-xl font-bold text-white shadow-sm">
            {initials || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-gray-900">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="truncate text-sm text-gray-500">{profile.email}</p>
          </div>

          {editing ? (
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="rounded-xl bg-[#B1C9DC] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startEditing}
              className="shrink-0 rounded-xl bg-[#B1C9DC] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98]"
            >
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} noValidate>
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  First name
                </span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className={inputStyles}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Last name
                </span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className={inputStyles}
                />
              </label>

              <Field label="Role" value={profile.role} className="capitalize" />
              <Field
                label="Member since"
                value={new Date(profile.createdAt).toLocaleDateString()}
              />
              <Field label="User ID" value={`#${profile.id}`} />
            </div>

            {saveError && (
              <p
                role="alert"
                className="mt-5 rounded-lg bg-[#F1C4C9]/50 px-3 py-2 text-sm font-medium text-[#8B2E38]"
              >
                {saveError}
              </p>
            )}

          </form>
        ) : (
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="First name" value={profile.firstName} />
            <Field label="Last name" value={profile.lastName} />
            <Field label="Role" value={profile.role} className="capitalize" />
            <Field
              label="Member since"
              value={new Date(profile.createdAt).toLocaleDateString()}
            />
            <Field label="User ID" value={`#${profile.id}`} />
          </div>
        )}

        <h2 className="mt-10 text-base font-bold text-gray-900">My email address</h2>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#B1C9DC]/30">
            <Mail className="h-4 w-4 text-[#3D6C94]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{profile.email}</p>
            <p className="text-xs text-gray-400">Used to sign in</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-10 flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  className = '',
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      <p className={`text-sm text-gray-900 ${className}`}>{value}</p>
    </div>
  );
}
