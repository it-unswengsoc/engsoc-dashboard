'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pencil, Trash2, MapPin, Link as LinkIcon } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import { getEventById, deleteEvent, getRsvpSummary, setRsvp, type RsvpSummary } from '@/services/events-api';
import { deleteMyCalendarEvent } from '@/services/user-calendar-api';
import { getProfile } from '@/services/auth-api';
import { formatFullDate, formatTime, CALENDAR_EVENTS_CHANGED_EVENT, type CalendarItem } from '@/lib/calendar';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';

type EventItem = Extract<CalendarItem, { kind: 'event' }>;

export interface EventDetailModalProps {
  open: boolean;
  item: EventItem | null;
  onClose: () => void;
  onEdit: (item: EventItem) => void;
}

/* Read-only detail view — the three-dot menu (only rendered once canEdit is
   known) is where Edit/Delete actually live now, rather than "Details"
   jumping straight into edit mode for everyone regardless of permission. */
function OptionsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Event options"
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5 text-[#3D6C94]" />
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold text-[#8B2E38] transition-colors hover:bg-[#F1C4C9]/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function EventDetailModal({ open, item, onClose, onEdit }: EventDetailModalProps) {
  const [canEdit, setCanEdit] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [facebookUrl, setFacebookUrl] = useState<string | null>(null);
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);
  const [rsvp, setRsvpSummary] = useState<RsvpSummary | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setConfirmingDelete(false);
    setError('');
    setLocation(item.location);
    setDescription(item.description);
    setFacebookUrl(null);
    setInstagramUrl(null);
    setRsvpSummary(null);

    const token = sessionStorage.getItem('token');

    if (item.source === 'shared' && item.officialEventId !== null) {
      const officialEventId = item.officialEventId;

      getEventById(officialEventId)
        .then(async (official) => {
          setLocation(official.location);
          setDescription(official.description);
          setFacebookUrl(official.facebookUrl);
          setInstagramUrl(official.instagramUrl);
          if (!token) return;
          const profile = await getProfile(token);
          setCanEdit(official.organizerId === profile.id || profile.role === 'admin');
        })
        .catch(() => setCanEdit(false));

      if (token) {
        getRsvpSummary(token, officialEventId).then(setRsvpSummary).catch(() => {});
      }
    } else {
      setCanEdit(item.canEdit);
    }
  }, [open, item]);

  async function handleRsvp(status: 'going' | 'not_going') {
    if (!item?.officialEventId) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setRsvpBusy(true);
    setError('');
    try {
      const summary = await setRsvp(token, item.officialEventId, status);
      setRsvpSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to RSVP');
    } finally {
      setRsvpBusy(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    const token = sessionStorage.getItem('token');
    if (!token) return;

    setDeleting(true);
    setError('');
    try {
      if (item.source === 'shared' && item.officialEventId) {
        await deleteEvent(token, item.officialEventId);
        window.dispatchEvent(new Event(DASHBOARD_DATA_CHANGED_EVENT));
      } else if (item.googleEventId) {
        await deleteMyCalendarEvent(token, item.googleEventId);
      }
      window.dispatchEvent(new Event(CALENDAR_EVENTS_CHANGED_EVENT));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (!item) return null;

  const label = item.source === 'shared' ? `${item.type} EVENT` : 'PERSONAL EVENT';
  const myStatus = rsvp?.myStatus ?? null;

  return (
    <Dialog open={open} title="Event details" size="md" onClose={onClose}>
      <div className="mt-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
            <span className="mt-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-gray-500">
              {label}
            </span>
          </div>
          {canEdit && <OptionsMenu onEdit={() => onEdit(item)} onDelete={() => setConfirmingDelete(true)} />}
        </div>

        {confirmingDelete ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              This can&apos;t be undone — the event will be gone for everyone{item.source === 'shared' ? ', including anyone who RSVP\'d' : ''}.
            </p>
            {error && (
              <p role="alert" className="text-xs font-bold text-[#ED6672]">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-[#ED6672] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#d95a66] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 font-mono text-xs text-gray-500">
              <p>{formatFullDate(item.start)}</p>
              {!item.allDay && (
                <p>
                  {formatTime(item.start)}
                  {item.end ? ` – ${formatTime(item.end)}` : ''}
                </p>
              )}
              {location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {location}
                </div>
              )}
            </div>

            {description && <p className="text-sm text-gray-700">{description}</p>}

            {(facebookUrl || instagramUrl) && (
              <div className="flex gap-3">
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#3D6C94] hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Facebook
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#3D6C94] hover:underline"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Instagram
                  </a>
                )}
              </div>
            )}

            {item.source === 'shared' && (
              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Are you going?</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRsvp('going')}
                    disabled={rsvpBusy}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      myStatus === 'going' ? 'bg-[#3D6C94] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Going
                  </button>
                  <button
                    onClick={() => handleRsvp('not_going')}
                    disabled={rsvpBusy}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      myStatus === 'not_going' ? 'bg-gray-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Can&apos;t come
                  </button>
                </div>

                {rsvp && (rsvp.going.length > 0 || rsvp.notGoing.length > 0) && (
                  <div className="mt-1 flex flex-col gap-1.5 font-mono text-xs text-gray-500">
                    {rsvp.going.length > 0 && (
                      <p>
                        <span className="font-bold text-gray-700">{rsvp.going.length} going:</span>{' '}
                        {rsvp.going.map((e) => e.name).join(', ')}
                      </p>
                    )}
                    {rsvp.notGoing.length > 0 && (
                      <p>
                        <span className="font-bold text-gray-700">{rsvp.notGoing.length} can&apos;t come:</span>{' '}
                        {rsvp.notGoing.map((e) => e.name).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs font-bold text-[#ED6672]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Close
            </button>
          </>
        )}
      </div>
    </Dialog>
  );
}
