import {
  Camera,
  Mail,
  Palette,
  Receipt,
  ShieldAlert,
  Video,
  type LucideIcon,
} from 'lucide-react';
import type { FieldDef } from '@/components/dialogs/FormDialog';
import { PORT_OPTIONS } from '@/lib/ports';
import type { RequestAnswer } from '@/types/requests';

/* Each request type's form. `value` is the requestType the API receives
   (backend functions/request-types.ts decides where it goes and who handles
   it), so the labels stay free to be reworded. The requests page reads these
   too, to show a request's stored answers under their questions. */
export interface RequestForm {
  value: string;
  label: string;
  icon: LucideIcon;
  fields: FieldDef[];
}

export const REQUEST_FORMS: RequestForm[] = [
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
      { kind: 'text', name: 'title', label: 'Request title', placeholder: 'e.g. Sponsorship deadline reminder', required: true },
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
      { kind: 'text', name: 'title', label: 'Request title', placeholder: 'e.g. Careers Night photos', required: true },
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
      { kind: 'text', name: 'title', label: 'Request title', placeholder: 'e.g. O-Week sponsor reel', required: true },
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
      // 3MB matches the backend's cap (see backend functions/requests.ts).
      { kind: 'file', name: 'receipt', label: 'Receipt', accept: 'image/*,.pdf', required: true, maxSizeMB: 3 },
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
      { kind: 'boolean', name: 'anonymous', label: "Submit anonymously (HR won't see your name)", span: 'half' },
    ],
  },
];

export function requestForm(requestType: string): RequestForm | undefined {
  return REQUEST_FORMS.find((form) => form.value === requestType);
}

/* A stored request's answers as label/value pairs, in the form's own order,
   for the requests page. The title is shown as the heading instead, and a
   file is listed under attachments rather than here. */
export function toAnswers(requestType: string, formData: Record<string, unknown>): RequestAnswer[] {
  const form = requestForm(requestType);
  if (!form) {
    return Object.entries(formData).map(([label, value]) => ({ label, value: String(value) }));
  }

  const answers: RequestAnswer[] = [];
  for (const field of form.fields) {
    if (field.kind === 'notice' || field.kind === 'file' || field.name === 'title') continue;
    const value = formData[field.name];
    if (value === undefined || value === null || value === '') continue;

    let text: string;
    if (field.kind === 'boolean') {
      text = value === true ? 'Yes' : 'No';
    } else if (field.kind === 'checkboxes' && Array.isArray(value)) {
      text = value.map((v) => field.options.find((o) => o.value === v)?.label ?? String(v)).join(', ');
    } else if (field.kind === 'select' || field.kind === 'segmented') {
      text = field.options.find((o) => o.value === value)?.label ?? String(value);
    } else if (field.kind === 'date' && typeof value === 'string') {
      text = new Date(`${value}T00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (field.kind === 'number' && field.name === 'amount') {
      text = `$${Number(value).toFixed(2)}`;
    } else {
      text = String(value);
    }
    answers.push({ label: field.label, value: text });
  }
  return answers;
}
