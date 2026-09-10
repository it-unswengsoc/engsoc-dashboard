'use client';

import { useState } from 'react';
import { ClipboardList, Calendar, Megaphone, Inbox, type LucideIcon } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import FormDialog, {
  type FieldDef,
  type FieldPayload,
  type FieldValues,
} from '@/components/dialogs/FormDialog';

interface NewItemDialogProps {
  open: boolean;
  onClose: () => void;
}

type View = 'chooser' | 'request' | 'event' | 'announcement' | 'task';

const options: { view: Exclude<View, 'chooser'>; label: string; icon: LucideIcon }[] = [
  { view: 'request', label: 'New request', icon: Inbox },
  { view: 'event', label: 'New event', icon: Calendar },
  { view: 'announcement', label: 'New announcement', icon: Megaphone },
  { view: 'task', label: 'New task', icon: ClipboardList },
];

/* Each request type swaps in its own fields below the type selector. `value`
   is what the API will receive, so the labels stay free to be reworded. */
const requestTypes: { value: string; label: string; fields: FieldDef[] }[] = [
  {
    value: 'marketing',
    label: 'Marketing request',
    fields: [
      { kind: 'text', name: 'eventName', label: 'Event Name', required: true },
      { kind: 'date', name: 'eventLaunchDate', label: 'Event Launch Date' },
      { kind: 'date', name: 'eventDate', label: 'Event Date' },
      { kind: 'textarea', name: 'eventTheme', label: 'Event Theme', required: true },
    ],
  },
  {
    value: 'it',
    label: 'IT request',
    fields: [
      { kind: 'text', name: 'title', label: 'Title', required: true },
      { kind: 'textarea', name: 'description', label: 'Description', required: true },
      {
        kind: 'select',
        name: 'category',
        label: 'Category',
        options: [
          { value: 'website', label: 'Website' },
          { value: 'accounts', label: 'Email / accounts' },
          { value: 'hardware', label: 'Hardware' },
          { value: 'access', label: 'Access / permissions' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        kind: 'segmented',
        name: 'urgency',
        label: 'Urgency',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
      },
      { kind: 'file', name: 'attachment', label: 'Attachment' },
    ],
  },
  {
    value: 'reimbursement',
    label: 'Reimbursement form',
    fields: [
      { kind: 'text', name: 'title', label: 'Title', required: true },
      { kind: 'textarea', name: 'description', label: 'Description', required: true },
      {
        kind: 'number',
        name: 'amount',
        label: 'Amount (AUD)',
        placeholder: '0.00',
        required: true,
      },
      { kind: 'date', name: 'purchasedOn', label: 'Date of purchase', required: true },
      { kind: 'file', name: 'receipt', label: 'Receipt', accept: 'image/*,.pdf', required: true },
    ],
  },
  {
    value: 'grievance',
    label: 'Grievance form',
    fields: [
      { kind: 'text', name: 'title', label: 'Subject', required: true },
      { kind: 'textarea', name: 'description', label: 'What happened', required: true },
      { kind: 'text', name: 'involved', label: 'Who was involved' },
      {
        kind: 'segmented',
        name: 'anonymous',
        label: 'Submit anonymously',
        options: [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ],
      },
      { kind: 'file', name: 'attachment', label: 'Attachment' },
    ],
  },
  {
    value: 'publications',
    label: 'Publications request',
    fields: [
      { kind: 'text', name: 'title', label: 'Title', required: true },
      { kind: 'textarea', name: 'description', label: 'Description', required: true },
      {
        kind: 'select',
        name: 'publication',
        label: 'Publication',
        options: [
          { value: 'handbook', label: 'Handbook' },
          { value: 'newsletter', label: 'Newsletter' },
          { value: 'blog', label: 'Blog' },
          { value: 'social', label: 'Social' },
        ],
      },
      { kind: 'date', name: 'deadline', label: 'Deadline' },
      { kind: 'file', name: 'draft', label: 'Draft' },
    ],
  },
];

function requestForm(values: FieldValues): FieldDef[] {
  const selected = requestTypes.find((type) => type.value === values.requestType);

  return [
    {
      kind: 'select',
      name: 'requestType',
      label: 'Request type',
      placeholder: 'Select a request type...',
      options: requestTypes.map(({ value, label }) => ({ value, label })),
      required: true,
    },
    ...(selected?.fields ?? []),
  ];
}

/* Mirrors POST /api/event's body, plus the INTERNAL/EXTERNAL split the
   dashboard renders — values match EventType, though note the API and the
   events table have no column to store it. */
const eventForm: FieldDef[] = [
  { kind: 'text', name: 'title', label: 'Event title', required: true },
  { kind: 'datetime', name: 'eventDate', label: 'Date and time', required: true },
  {
    kind: 'segmented',
    name: 'type',
    label: 'Type',
    options: [
      { value: 'INTERNAL', label: 'Internal' },
      { value: 'EXTERNAL', label: 'External' },
    ],
  },
  { kind: 'text', name: 'location', label: 'Location' },
  { kind: 'number', name: 'capacity', label: 'Capacity' },
  { kind: 'textarea', name: 'description', label: 'Description' },
];

const announcementForm: FieldDef[] = [
  { kind: 'text', name: 'title', label: 'Title', required: true },
  { kind: 'textarea', name: 'description', label: 'Description', required: true },
  { kind: 'file', name: 'image', label: 'Picture', accept: 'image/*' },
];

const taskForm: FieldDef[] = [
  { kind: 'text', name: 'name', label: 'Task name', required: true },
  { kind: 'datetime', name: 'dueAt', label: 'Due date and time', required: true },
];

type FormFields = FieldDef[] | ((values: FieldValues) => FieldDef[]);

const forms: Record<
  Exclude<View, 'chooser'>,
  { title: string; submitLabel: string; fields: FormFields }
> = {
  request: { title: 'New request', submitLabel: 'Submit request', fields: requestForm },
  event: { title: 'New event', submitLabel: 'Create event', fields: eventForm },
  announcement: { title: 'New announcement', submitLabel: 'Post', fields: announcementForm },
  task: { title: 'New task', submitLabel: 'Add task', fields: taskForm },
};

export default function NewItemDialog({ open, onClose }: NewItemDialogProps) {
  const [view, setView] = useState<View>('chooser');

  function handleClose() {
    setView('chooser');
    onClose();
  }

  /* The one seam backend wiring plugs into: `payload` is already pruned to the
     fields on screen, with numbers coerced and datetimes pinned to ISO. */
  function handleSubmit(payload: FieldPayload) {
    /* TODO: POST per view. /api/event exists (title, description, eventDate,
       location, capacity); requests, announcements and tasks have no endpoint
       yet. File fields still carry only the filename, so uploads need the File
       object itself sent as FormData. */
  }

  if (!open) return null;

  if (view !== 'chooser') {
    const form = forms[view];

    return (
      <FormDialog
        open
        title={form.title}
        submitLabel={form.submitLabel}
        fields={form.fields}
        onSubmit={handleSubmit}
        onClose={handleClose}
        onBack={() => setView('chooser')}
      />
    );
  }

  return (
    <Dialog open title="What would you like to work on?" size="sm" onClose={handleClose}>
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
