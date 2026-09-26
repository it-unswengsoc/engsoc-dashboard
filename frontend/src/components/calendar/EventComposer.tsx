'use client';

import { useEffect, useState } from 'react';
import Dialog from '@/components/dialogs/Dialog';
import type { ComposerPrefill } from './CalendarContext';
import { createEvent, updateEvent, deleteEvent, getEventById } from '@/services/events-api';
import {
  createMyCalendarEvent,
  updateMyCalendarEvent,
  deleteMyCalendarEvent,
} from '@/services/user-calendar-api';
import { getProfile } from '@/services/auth-api';
import { CALENDAR_EVENTS_CHANGED_EVENT } from '@/lib/calendar';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';

export interface EventComposerProps {
  open: boolean;
  prefill: ComposerPrefill | null;
  canCreateSharedEvent: boolean;
  onClose: () => void;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combine(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

/* One dialog for creating, editing and deleting a calendar item — shared vs
   personal is a real fork in where the write goes (Postgres + shared Google
   Calendar mirror, vs a straight write to the member's own Google Calendar),
   decided by `target`. Existing items keep whichever they already are;
   only a brand-new item lets the signed-in member choose, and only if
   they're allowed to create shared events at all. */
export default function EventComposer({ open, prefill, canCreateSharedEvent, onClose }: EventComposerProps) {
  const [title, setTitle] = useState('');
  const [titleMissing, setTitleMissing] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL');
  const [capacity, setCapacity] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [target, setTarget] = useState<'personal' | 'shared'>('personal');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(true);

  const mode = prefill?.mode ?? 'create';
  const editItem = prefill?.mode === 'edit' ? prefill.item : null;
  // Once created, an item's shared/personal home doesn't change through
  // this dialog — only a new item lets the member pick.
  const targetLocked = mode === 'edit';

  useEffect(() => {
    if (!open || !prefill) return;
    setError('');
    setTitleMissing(false);

    if (prefill.mode === 'create') {
      setTitle('');
      setAllDay(prefill.allDay);
      setStartDate(toDateInput(prefill.start));
      setStartTime(toTimeInput(prefill.start));
      setEndDate(toDateInput(prefill.end));
      setEndTime(toTimeInput(prefill.end));
      setLocation('');
      setDescription('');
      setEventType('INTERNAL');
      setCapacity('');
      setFacebookUrl('');
      setInstagramUrl('');
      setTarget('personal');
      setCanEdit(true);
      return;
    }

    const item = prefill.item;
    setAllDay(item.allDay);
    setStartDate(toDateInput(item.start));
    setStartTime(toTimeInput(item.start));
    const end = item.end ?? item.start;
    setEndDate(toDateInput(end));
    setEndTime(toTimeInput(end));
    setTarget(item.source);
    setEventType(item.type);

    if (item.source === 'shared' && item.officialEventId !== null) {
      // Google Calendar has no "capacity" concept, and doesn't carry
      // organizerId at all — fetch the real Postgres row so editing a shared
      // event doesn't lose the capacity field, and so canEdit can be a real
      // organizer-or-admin check (the Google-derived item.canEdit is always
      // false for shared events — that flag is about *Google* calendar
      // ownership, which the shared calendar never grants a regular member).
      const officialEventId = item.officialEventId;
      getEventById(officialEventId)
        .then((official) => {
          setTitle(official.name);
          setLocation(official.location ?? '');
          setDescription(official.description ?? '');
          setCapacity(official.capacity !== null ? String(official.capacity) : '');
          setFacebookUrl(official.facebookUrl ?? '');
          setInstagramUrl(official.instagramUrl ?? '');

          const token = sessionStorage.getItem('token');
          if (!token) return;
          getProfile(token)
            .then((p) => setCanEdit(official.organizerId === p.id || p.role === 'admin'))
            .catch(() => setCanEdit(false));
        })
        .catch(() => {
          setTitle(item.name);
          setLocation(item.location ?? '');
          setDescription(item.description ?? '');
          setCanEdit(false);
        });
    } else {
      setTitle(item.name);
      setLocation(item.location ?? '');
      setDescription(item.description ?? '');
      setCapacity('');
      setFacebookUrl('');
      setInstagramUrl('');
      setCanEdit(item.canEdit);
    }
  }, [open, prefill]);

  function notifyChanged(isShared: boolean) {
    window.dispatchEvent(new Event(CALENDAR_EVENTS_CHANGED_EVENT));
    if (isShared) window.dispatchEvent(new Event(DASHBOARD_DATA_CHANGED_EVENT));
  }

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleMissing(true);
      return;
    }

    const start = allDay ? combine(startDate, '00:00') : combine(startDate, startTime);
    const end = allDay ? combine(endDate, '00:00') : combine(endDate, endTime);
    if (end < start) {
      setError('End must be after start.');
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      setError('Your session has expired — sign in again.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (target === 'shared') {
        const shared = {
          title: trimmedTitle,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          eventType: eventType.toLowerCase() as 'internal' | 'external',
          location: location.trim() || undefined,
          description: description.trim() || undefined,
          capacity: capacity.trim() ? Number(capacity) : undefined,
          facebookUrl: facebookUrl.trim() || undefined,
          instagramUrl: instagramUrl.trim() || undefined,
        };
        if (mode === 'edit' && editItem?.officialEventId) {
          await updateEvent(token, editItem.officialEventId, shared);
        } else {
          await createEvent(token, shared);
        }
        notifyChanged(true);
      } else {
        // Google's all-day end date is exclusive (the day AFTER the last
        // day) — add a day back when sending an all-day range.
        const googleEnd = new Date(end);
        if (allDay) googleEnd.setDate(googleEnd.getDate() + 1);

        const personal = {
          title: trimmedTitle,
          startsAt: allDay ? toDateInput(start) : start.toISOString(),
          endsAt: allDay ? toDateInput(googleEnd) : end.toISOString(),
          allDay,
          location: location.trim() || null,
          description: description.trim() || null,
        };
        if (mode === 'edit' && editItem?.googleEventId) {
          await updateMyCalendarEvent(token, editItem.googleEventId, personal);
        } else {
          await createMyCalendarEvent(token, personal);
        }
        notifyChanged(false);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const token = sessionStorage.getItem('token');
    if (!token || !editItem) return;

    setDeleting(true);
    setError('');
    try {
      if (editItem.source === 'shared' && editItem.officialEventId) {
        await deleteEvent(token, editItem.officialEventId);
        notifyChanged(true);
      } else if (editItem.googleEventId) {
        await deleteMyCalendarEvent(token, editItem.googleEventId);
        notifyChanged(false);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const inputStyles =
    'w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]';
  const labelStyles = 'text-xs font-bold uppercase tracking-wide text-gray-500';

  if (!prefill) return null;

  return (
    <Dialog open={open} title={mode === 'create' ? 'New event' : 'Edit event'} size="2xl" onClose={onClose}>
      <div className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelStyles}>
            Title <span className="text-[#ED6672]">*</span>
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleMissing(false);
            }}
            placeholder="What's happening?"
            className={`${inputStyles} ${titleMissing ? 'ring-2 ring-[#ED6672]' : ''}`}
            disabled={!canEdit}
          />
          {titleMissing && (
            <span role="alert" className="text-xs font-bold text-[#ED6672]">
              Title is required
            </span>
          )}
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} disabled={!canEdit} />
          <span className="text-sm font-bold text-gray-700">All day</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelStyles}>Start</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputStyles}
                disabled={!canEdit}
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputStyles}
                  disabled={!canEdit}
                />
              )}
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelStyles}>End</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputStyles}
                disabled={!canEdit}
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputStyles}
                  disabled={!canEdit}
                />
              )}
            </div>
          </label>
        </div>

        {!targetLocked && canCreateSharedEvent && (
          <label className="flex flex-col gap-1.5">
            <span className={labelStyles}>Where should this go?</span>
            <div className="flex overflow-hidden rounded-lg border border-gray-200">
              {(['personal', 'shared'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTarget(opt)}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                    target === opt ? 'bg-[#B1C9DC] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {opt === 'personal' ? 'Just me' : 'Shared EngSoc event'}
                </button>
              ))}
            </div>
          </label>
        )}
        {targetLocked && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">
            {target === 'shared' ? 'Shared EngSoc event' : 'Personal event'}
          </p>
        )}

        {target === 'shared' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelStyles}>Type</span>
              <div className="flex overflow-hidden rounded-lg border border-gray-200">
                {(['INTERNAL', 'EXTERNAL'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEventType(opt)}
                    disabled={!canEdit}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                      eventType === opt ? 'bg-[#B1C9DC] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {opt === 'INTERNAL' ? 'Internal' : 'External'}
                  </button>
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelStyles}>Capacity</span>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputStyles}
                disabled={!canEdit}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelStyles}>Facebook link</span>
              <input
                type="text"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                placeholder="https://facebook.com/events/..."
                className={inputStyles}
                disabled={!canEdit}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelStyles}>Instagram link</span>
              <input
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className={inputStyles}
                disabled={!canEdit}
              />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={labelStyles}>Location</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputStyles}
            disabled={!canEdit}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelStyles}>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputStyles} resize-none`}
            disabled={!canEdit}
          />
        </label>

        {error && (
          <p role="alert" className="text-xs font-bold text-[#ED6672]">
            {error}
          </p>
        )}

        {!canEdit ? (
          <p className="font-mono text-xs text-gray-400">You don't have permission to edit this event.</p>
        ) : (
          <div className="mt-2 flex gap-3">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
                className="rounded-xl border border-[#F1C4C9] px-4 py-2.5 text-sm font-bold text-[#8B2E38] transition-colors hover:bg-[#F1C4C9]/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || deleting}
              className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
