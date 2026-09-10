'use client';

import { useState } from 'react';
import { ClipboardList, Calendar, Megaphone, Inbox, type LucideIcon } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import FormDialog, { type FieldDef, type FieldValues } from '@/components/dialogs/FormDialog';

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

/* Each request type swaps in its own fields below the type selector. */
const requestFields: Record<string, FieldDef[]> = {
  'Marketing request': [
    { kind: 'text', name: 'title', label: 'Title', required: true },
    { kind: 'textarea', name: 'description', label: 'Description', required: true },
    { kind: 'date', name: 'neededBy', label: 'Needed by' },
    { kind: 'file', name: 'assets', label: 'Assets' },
  ],
  'IT request': [
    { kind: 'text', name: 'title', label: 'Title', required: true },
    { kind: 'textarea', name: 'description', label: 'Description', required: true },
    {
      kind: 'select',
      name: 'category',
      label: 'Category',
      options: ['Website', 'Email / accounts', 'Hardware', 'Access / permissions', 'Other'],
    },
    { kind: 'segmented', name: 'urgency', label: 'Urgency', options: ['Low', 'Medium', 'High'] },
    { kind: 'file', name: 'attachment', label: 'Attachment' },
  ],
  'Reimbursement form': [
    { kind: 'text', name: 'title', label: 'Title', required: true },
    { kind: 'textarea', name: 'description', label: 'Description', required: true },
    { kind: 'number', name: 'amount', label: 'Amount (AUD)', placeholder: '0.00', required: true },
    { kind: 'date', name: 'purchasedOn', label: 'Date of purchase', required: true },
    { kind: 'file', name: 'receipt', label: 'Receipt', accept: 'image/*,.pdf', required: true },
  ],
  'Grievance form': [
    { kind: 'text', name: 'title', label: 'Subject', required: true },
    { kind: 'textarea', name: 'description', label: 'What happened', required: true },
    { kind: 'text', name: 'involved', label: 'Who was involved' },
    { kind: 'segmented', name: 'anonymous', label: 'Submit anonymously', options: ['Yes', 'No'] },
    { kind: 'file', name: 'attachment', label: 'Attachment' },
  ],
  'Publications request': [
    { kind: 'text', name: 'title', label: 'Title', required: true },
    { kind: 'textarea', name: 'description', label: 'Description', required: true },
    {
      kind: 'select',
      name: 'publication',
      label: 'Publication',
      options: ['Handbook', 'Newsletter', 'Blog', 'Social'],
    },
    { kind: 'date', name: 'deadline', label: 'Deadline' },
    { kind: 'file', name: 'draft', label: 'Draft' },
  ],
};

function requestForm(values: FieldValues): FieldDef[] {
  return [
    {
      kind: 'select',
      name: 'requestType',
      label: 'Request type',
      placeholder: 'Select a request type...',
      options: Object.keys(requestFields),
      required: true,
    },
    ...(requestFields[values.requestType] ?? []),
  ];
}

/* Mirrors POST /api/event's body, plus the INTERNAL/EXTERNAL split the
   dashboard renders — note the API and events table have no column for it. */
const eventForm: FieldDef[] = [
  { kind: 'text', name: 'title', label: 'Event title', required: true },
  { kind: 'datetime', name: 'eventDate', label: 'Date and time', required: true },
  { kind: 'segmented', name: 'type', label: 'Type', options: ['Internal', 'External'] },
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

export default function NewItemDialog({ open, onClose }: NewItemDialogProps) {
  const [view, setView] = useState<View>('chooser');

  function handleClose() {
    setView('chooser');
    onClose();
  }

  const back = () => setView('chooser');

  if (!open) return null;

  if (view === 'request') {
    return (
      <FormDialog
        open
        title="New request"
        submitLabel="Submit request"
        fields={requestForm}
        onClose={handleClose}
        onBack={back}
      />
    );
  }

  if (view === 'event') {
    return (
      <FormDialog
        open
        title="New event"
        submitLabel="Create event"
        fields={eventForm}
        onClose={handleClose}
        onBack={back}
      />
    );
  }

  if (view === 'announcement') {
    return (
      <FormDialog
        open
        title="New announcement"
        submitLabel="Post"
        fields={announcementForm}
        onClose={handleClose}
        onBack={back}
      />
    );
  }

  if (view === 'task') {
    return (
      <FormDialog
        open
        title="New task"
        submitLabel="Add task"
        fields={taskForm}
        onClose={handleClose}
        onBack={back}
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
