'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  ChevronRight,
  ClipboardList,
  Calendar,
  Mail,
  Megaphone,
  Inbox,
  Palette,
  Receipt,
  ShieldAlert,
  Video,
  type LucideIcon,
} from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import FormDialog, {
  type FieldDef,
  type FieldPayload,
  type FieldValues,
} from '@/components/dialogs/FormDialog';
import { createEvent } from '@/services/events-api';
import { CALENDAR_EVENTS_CHANGED_EVENT } from '@/lib/calendar';

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

/* Values must match the port_type enum in database/create-tables.sql exactly:
   Postgres enums are case-sensitive, so 'IT' and 'publication' are not
   interchangeable with 'it' and 'publications'. Labels are display copy. */
const PORT_OPTIONS = [
  { value: 'careers', label: 'Careers' },
  { value: 'sponsorships', label: 'Sponsorships' },
  { value: 'IT', label: 'IT' },
  { value: 'publication', label: 'Publications' },
  { value: 'cabinet', label: 'Cabinet' },
  { value: 'socials', label: 'Socials' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'programs', label: 'Programs' },
  { value: 'HR', label: 'HR' },
];

/* Each request type swaps in its own fields below the type selector. `value`
   is what the API will receive, so the labels stay free to be reworded. */
const requestTypes: {
  value: string;
  label: string;
  icon: LucideIcon;
  fields: FieldDef[];
}[] = [
  {
    value: 'marketing',
    label: 'Marketing request',
    icon: Palette,
    fields: [
      {
        kind: 'notice',
        name: 'noticePeriod',
        text: '📝 Fill this form with at least 2 weeks notice (strict). For flagship events, at least 4 weeks notice please.',
      },
      { kind: 'text', name: 'eventName', label: 'Event Name', required: true, span: 'half' },
      {
        kind: 'select',
        name: 'port',
        label: 'Port',
        placeholder: 'Select a port...',
        options: PORT_OPTIONS,
        span: 'half',
      },
      { kind: 'date', name: 'eventLaunchDate', label: 'Event Launch Date', span: 'half' },
      { kind: 'date', name: 'eventDate', label: 'Event Date', span: 'half' },
      { kind: 'textarea', name: 'eventTheme', label: 'Event Theme', required: true },
      {
        kind: 'checkboxes',
        name: 'materials',
        label: 'Marketing material(s) needed',
        required: true,
        options: [
          { value: 'cover-photo', label: 'Cover Photo [IG & FB]' },
          { value: 'countdowns', label: 'Countdowns [IG] (1 week, 5 days, 3 days, 1 day)' },
          { value: 'infographics', label: 'Infographics (please specify in GC)' },
          { value: 'form-banner', label: 'Google Form Banner' },
          { value: 'flyers', label: 'Flyers/Posters' },
        ],
      },
      { kind: 'text', name: 'otherMaterial', label: 'Other (please specify)' },
    ],
  },
  {
    value: 'mass_email',
    label: 'Mass emailing',
    icon: Mail,
    fields: [
      {
        kind: 'notice',
        name: 'massEmailNotice',
        text: '📧 If your event requires mass emailing, please submit this at least 2 weeks in advance. Following these two things makes the process a lot easier:',
        steps: [
          'Provide a Google Sheet link with the categories you want repeated in each email. Emails always go in the first column — anything else (name, port, time, date, room) can follow in the columns after.',
          'Provide the email template as a Google Doc link. Put anything that changes in square brackets, like "Dear [Name], … the event will be at [Time]."',
        ],
        footer: 'Thank you so much for your patience filling this out 🤠',
      },
      {
        kind: 'textarea',
        name: 'reason',
        label: 'Reason for mass emailing',
        required: true,
      },
      {
        kind: 'date',
        name: 'releaseDate',
        label: 'Date for mass emailing to be released',
        required: true,
        span: 'half',
      },
      {
        kind: 'select',
        name: 'port',
        label: 'Port',
        placeholder: 'Select a port...',
        options: PORT_OPTIONS,
        span: 'half',
      },
      {
        kind: 'text',
        name: 'sheetUrl',
        label: 'Link to Google Sheet',
        placeholder: 'https://docs.google.com/spreadsheets/...',
        required: true,
      },
      {
        kind: 'text',
        name: 'templateUrl',
        label: 'Email template Google Doc link',
        placeholder: 'https://docs.google.com/document/...',
        required: true,
      },
    ],
  },
  {
    value: 'event_photos',
    label: 'Event photo request',
    icon: Camera,
    fields: [
      {
        kind: 'notice',
        name: 'eventPhotoNotice',
        text: '📸 Need photos at your event? Say no more. Please submit at least 2 weeks before the due date. The earlier the better.',
      },
      {
        kind: 'select',
        name: 'port',
        label: 'Port',
        placeholder: 'Select a port...',
        options: PORT_OPTIONS,
        required: true,
        span: 'half',
      },
      { kind: 'date', name: 'eventDate', label: 'Date of event', required: true, span: 'half' },
      {
        kind: 'textarea',
        name: 'eventDetails',
        label: 'Event details (plus FB link if applicable)',
        required: true,
      },
    ],
  },
  {
    value: 'multimedia',
    label: 'Multimedia request',
    icon: Video,
    fields: [
      {
        kind: 'notice',
        name: 'multimediaNotice',
        text: '🎬 Want a viral video to market your upcoming event? No worries, PUBS got you. Please submit at least 2 weeks before the due date; the earlier it comes in, the better.',
      },
      {
        kind: 'select',
        name: 'port',
        label: 'Port',
        placeholder: 'Select a port...',
        options: PORT_OPTIONS,
        required: true,
        span: 'half',
      },
      { kind: 'date', name: 'dueDate', label: 'Due date', required: true, span: 'half' },
      {
        kind: 'textarea',
        name: 'eventDetails',
        label: 'Event details (plus FB link if applicable)',
        required: true,
      },
      { kind: 'textarea', name: 'ideas', label: 'Any ideas you might have?' },
    ],
  },
  {
    value: 'reimbursement',
    label: 'Reimbursement form',
    icon: Receipt,
    fields: [
      { kind: 'text', name: 'title', label: 'Title', required: true },
      { kind: 'textarea', name: 'description', label: 'Description', required: true },
      {
        kind: 'number',
        name: 'amount',
        label: 'Amount (AUD)',
        placeholder: '0.00',
        required: true,
        span: 'half',
      },
      {
        kind: 'date',
        name: 'purchasedOn',
        label: 'Date of purchase',
        required: true,
        span: 'half',
      },
      { kind: 'file', name: 'receipt', label: 'Receipt', accept: 'image/*,.pdf', required: true },
    ],
  },
  {
    value: 'grievance',
    label: 'Grievance form',
    icon: ShieldAlert,
    fields: [
      { kind: 'text', name: 'title', label: 'Subject', required: true },
      { kind: 'textarea', name: 'description', label: 'What happened', required: true },
      { kind: 'text', name: 'involved', label: 'Who was involved', span: 'half' },
      { kind: 'boolean', name: 'anonymous', label: 'Submit anonymously', span: 'half' },
      { kind: 'file', name: 'attachment', label: 'Attachment' },
    ],
  },
];

/* Field names match POST /events's body except eventDate (-> startDate) and
   type (INTERNAL/EXTERNAL -> internal/external) — mapped in
   handleCreateEvent below. */
const eventForm: FieldDef[] = [
  { kind: 'text', name: 'title', label: 'Event title', required: true },
  { kind: 'datetime', name: 'eventDate', label: 'Date and time', required: true, span: 'half' },
  {
    kind: 'segmented',
    name: 'type',
    label: 'Type',
    span: 'half',
    options: [
      { value: 'INTERNAL', label: 'Internal' },
      { value: 'EXTERNAL', label: 'External' },
    ],
  },
  { kind: 'text', name: 'location', label: 'Location', span: 'half' },
  { kind: 'number', name: 'capacity', label: 'Capacity', span: 'half' },
  { kind: 'textarea', name: 'description', label: 'Description' },
];

const announcementForm: FieldDef[] = [
  { kind: 'text', name: 'title', label: 'Title', required: true },
  { kind: 'textarea', name: 'description', label: 'Description', required: true },
  { kind: 'file', name: 'image', label: 'Picture', accept: 'image/*' },
];

/* Assignment is one-of, so the toggle picks the target and only that control
   follows — showing a port dropdown and a person box side by side read as
   "both". `assignee` is free text because naming a person needs a users
   listing, and no such endpoint exists yet; swap it for a select once one does. */
function taskForm(values: FieldValues): FieldDef[] {
  const target: FieldDef[] =
    values.assignTo === 'port'
      ? [
          {
            kind: 'select',
            name: 'port',
            label: 'Which port',
            placeholder: 'Select a port...',
            options: PORT_OPTIONS,
            required: true,
          },
        ]
      : values.assignTo === 'person'
        ? [
            {
              kind: 'text',
              name: 'assignee',
              label: 'Who',
              placeholder: 'Name or email',
              required: true,
            },
          ]
        : [];

  return [
    { kind: 'text', name: 'name', label: 'Task name', required: true, span: 'half' },
    { kind: 'datetime', name: 'dueAt', label: 'Due date and time', required: true, span: 'half' },
    {
      kind: 'segmented',
      name: 'assignTo',
      label: 'Assign to',
      options: [
        { value: 'me', label: 'Just me' },
        { value: 'port', label: 'A port' },
        { value: 'person', label: 'A person' },
      ],
    },
    ...target,
    { kind: 'textarea', name: 'description', label: 'Description' },
  ];
}

type FormView = Exclude<View, 'chooser' | 'request-list'>;

const forms: Record<
  FormView,
  { title: string; submitLabel: string; fields: FieldDef[] | ((values: FieldValues) => FieldDef[]) }
> = {
  event: { title: 'New event', submitLabel: 'Create event', fields: eventForm },
  announcement: { title: 'New announcement', submitLabel: 'Post', fields: announcementForm },
  task: { title: 'New task', submitLabel: 'Add task', fields: taskForm },
};

export default function NewItemDialog({ open, onClose }: NewItemDialogProps) {
  const router = useRouter();
  const [view, setView] = useState<View>('chooser');
  const [requestType, setRequestType] = useState<string | null>(null);

  /* Reset to the chooser on each *re*-open rather than in handleClose — Dialog
     now plays an exit animation before actually unmounting (see Dialog.tsx),
     which needs this same component instance to keep rendering whatever was
     on screen for the duration of that animation instead of jumping back to
     the chooser view the instant the user clicks away. */
  useEffect(() => {
    if (open) {
      setView('chooser');
      setRequestType(null);
    }
  }, [open]);

  /* Backend maps 1:1 onto eventForm's fields except eventDate -> startDate
     and INTERNAL/EXTERNAL -> internal/external — matching the casing
     EventType already uses on the calendar. The backend mirrors the created
     event to the shared EngSoc Google Calendar itself. router.refresh() picks
     up the dashboard's own Postgres-backed "upcoming events" widget; the
     calendar page reads each member's own Google Calendar client-side
     instead, so it needs the separate CALENDAR_EVENTS_CHANGED_EVENT nudge —
     and even then, this new event only appears there for someone who has
     already added the shared EngSoc calendar to their own Google account. */
  async function handleCreateEvent(payload: FieldPayload) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    await createEvent(token, {
      title: payload.title as string,
      startDate: payload.eventDate as string,
      eventType: payload.type === 'EXTERNAL' ? 'external' : 'internal',
      location: payload.location as string | undefined,
      capacity: payload.capacity as number | undefined,
      description: payload.description as string | undefined,
    });

    router.refresh();
    window.dispatchEvent(new Event(CALENDAR_EVENTS_CHANGED_EVENT));
  }

  /* Only "New event" is wired up — tasks, announcements and requests have no
     backend route mounted yet, so their submit stays disabled. */
  const onSubmit: Partial<Record<FormView, (payload: FieldPayload) => Promise<void>>> = {
    event: handleCreateEvent,
  };

  /* A chosen request type's own form. Which type it is lives in state rather
     than in the payload now that the selector is gone — whoever wires the
     submit will need to send `requestType` alongside it. */
  const selectedRequest = requestTypes.find((type) => type.value === requestType);

  if (selectedRequest) {
    return (
      <FormDialog
        open={open}
        title={selectedRequest.label}
        submitLabel="Submit request"
        fields={selectedRequest.fields}
        onClose={onClose}
        onBack={() => setRequestType(null)}
      />
    );
  }

  if (view === 'request-list') {
    return (
      <Dialog open={open} title="New request" onClose={onClose} onBack={() => setView('chooser')}>
        <div className="mt-5 flex flex-col">
          {requestTypes.map(({ value, label, icon: Icon }) => (
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

  if (view !== 'chooser') {
    const form = forms[view];

    return (
      <FormDialog
        open={open}
        title={form.title}
        submitLabel={form.submitLabel}
        fields={form.fields}
        onSubmit={onSubmit[view]}
        onClose={onClose}
        onBack={() => setView('chooser')}
      />
    );
  }

  return (
    <Dialog open={open} title="What would you like to work on?" size="sm" onClose={onClose}>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {options.map(({ view: target, label, icon: Icon }) => (
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
