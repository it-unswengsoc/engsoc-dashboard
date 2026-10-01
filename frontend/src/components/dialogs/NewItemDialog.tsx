'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ClipboardList, Calendar, Megaphone, Inbox, type LucideIcon } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import FormDialog, { type FieldPayload } from '@/components/dialogs/FormDialog';
import { createAnnouncement } from '@/services/announcements-api';
import { submitRequest } from '@/services/requests-api';
import { REQUEST_FORMS } from '@/lib/request-forms';
import { getProfile } from '@/services/auth-api';
import { getDirectory } from '@/services/users-api';
import type { DirectoryUser } from '@/types/directory';
import { DASHBOARD_DATA_CHANGED_EVENT } from '@/lib/dashboard-events';
import AnnouncementComposer from '@/components/announcements/AnnouncementComposer';
import EventComposer from '@/components/calendar/EventComposer';
import TaskComposer from '@/components/TaskComposer';

interface NewItemDialogProps {
  open: boolean;
  onClose: () => void;
}

type View = 'chooser' | 'request-list' | 'event' | 'announcement' | 'task';

const options: { view: Exclude<View, 'chooser'>; label: string; icon: LucideIcon }[] = [
  { view: 'request-list', label: 'New request', icon: Inbox },
  { view: 'event', label: 'New event', icon: Calendar },
  { view: 'announcement', label: 'New announcement', icon: Megaphone },
  { view: 'task', label: 'New task', icon: ClipboardList },
];



export default function NewItemDialog({ open, onClose }: NewItemDialogProps) {
  const router = useRouter();
  const [view, setView] = useState<View>('chooser');
  const [requestType, setRequestType] = useState<string | null>(null);

  // Only director/executive/admin can post an announcement (backend
  // enforces this too — see requireRole on POST /announcements). Fetched
  // fresh on every open rather than cached, same reasoning as everywhere
  // else this app checks role: a change should take effect immediately.
  const [role, setRole] = useState<string | null>(null);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const canPostAnnouncement = role === 'director' || role === 'executive' || role === 'admin';

  /* Reset to the chooser on each *re*-open rather than in handleClose — Dialog
     now plays an exit animation before actually unmounting (see Dialog.tsx),
     which needs this same component instance to keep rendering whatever was
     on screen for the duration of that animation instead of jumping back to
     the chooser view the instant the user clicks away. */
  useEffect(() => {
    if (open) {
      setView('chooser');
      setRequestType(null);

      const token = sessionStorage.getItem('token');
      if (token) {
        getProfile(token).then((p) => setRole(p.role)).catch(() => {});
        getDirectory(token).then(setDirectory).catch(() => {});
      }
    }
  }, [open]);

  async function handleCreateAnnouncement(input: { content: string; imageUrl?: string | null }) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    await createAnnouncement(token, {
      content: input.content,
      imageUrl: input.imageUrl ?? undefined,
    });

    window.dispatchEvent(new Event(DASHBOARD_DATA_CHANGED_EVENT));
  }

  /* Sent with the chosen type; the backend decides which port it goes to.
     A thrown error stays in the form (FormDialog shows it), and the requests
     page refetches on success. */
  async function handleSubmitRequest(payload: FieldPayload) {
    if (!requestType) return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    await submitRequest(token, requestType, payload);
    window.dispatchEvent(new Event(DASHBOARD_DATA_CHANGED_EVENT));
  }

  /* A chosen request type's own form (lib/request-forms.ts). */
  const selectedRequest = REQUEST_FORMS.find((form) => form.value === requestType);

  if (selectedRequest) {
    return (
      <FormDialog
        open={open}
        title={selectedRequest.label}
        submitLabel="Submit request"
        fields={selectedRequest.fields}
        onSubmit={handleSubmitRequest}
        onClose={onClose}
        onBack={() => setRequestType(null)}
      />
    );
  }

  if (view === 'request-list') {
    return (
      <Dialog open={open} title="New request" onClose={onClose} onBack={() => setView('chooser')}>
        <div className="mt-5 flex flex-col">
          {REQUEST_FORMS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setRequestType(value)}
              className="group flex items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#B1C9DC]/30 transition-colors group-hover:bg-[#B1C9DC]/60">
                <Icon className="h-4 w-4 text-[#3D6C94]" />
              </span>
              <span className="flex-1">{label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-400" />
            </button>
          ))}
        </div>
      </Dialog>
    );
  }

  // Its own bespoke composer (caption + image crop/position + a preview
  // step) rather than a generic FormDialog — see AnnouncementComposer.
  // Cancelling closes the whole "New" dialog rather than going back to the
  // chooser: the composer's own back arrow is already spoken for by its
  // preview<->compose step navigation.
  if (view === 'announcement') {
    return <AnnouncementComposer open={open} mode="create" onSubmit={handleCreateAnnouncement} onClose={onClose} />;
  }

  // Same reasoning as AnnouncementComposer above — a form this conditional
  // (personal vs shared, all-day vs timed, type/capacity only for shared)
  // doesn't fit FormDialog's generic declarative model.
  if (view === 'event') {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now);
    end.setHours(end.getHours() + 1);

    return (
      <EventComposer
        open={open}
        prefill={{ mode: 'create', start: now, end, allDay: false }}
        canCreateSharedEvent={canPostAnnouncement}
        onClose={onClose}
      />
    );
  }

  // Bespoke for the same reason as the two above — attaching a file needs a
  // real async Drive upload, which FormDialog's declarative fields don't
  // support (see TaskComposer).
  if (view === 'task') {
    return <TaskComposer open={open} directory={directory} onClose={onClose} />;
  }

  if (view !== 'chooser') {
    return null;
  }

  // "New announcement" only shows for director/executive/admin — everyone
  // else never sees a composer the backend would just 403 anyway.
  const visibleOptions = options.filter((o) => o.view !== 'announcement' || canPostAnnouncement);

  return (
    <Dialog open={open} title="What would you like to work on?" size="sm" onClose={onClose}>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {visibleOptions.map(({ view: target, label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setView(target)}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-5 text-center text-sm font-bold text-gray-700 transition-colors hover:border-[#B1C9DC] hover:bg-[#B1C9DC]/10"
          >
            <Icon className="h-5 w-5 text-[#3D6C94]" />
            {label}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
