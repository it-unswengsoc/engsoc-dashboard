'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Dialog from '@/components/dialogs/Dialog';
import Select, { type FieldOption } from '@/components/dialogs/Select';

export type { FieldOption };

/* Fields sit in a two-column grid. `span: 'half'` pairs a field with the next
   one — dates and short numbers — and everything else runs full width. */
type Spanned = { span?: 'half' | 'full' };

export type FieldDef = Spanned &
  (
    | {
        kind: 'text' | 'textarea' | 'number' | 'date' | 'datetime';
        name: string;
        label: string;
        placeholder?: string;
        required?: boolean;
      }
    | {
        kind: 'select' | 'segmented';
        name: string;
        label: string;
        options: FieldOption[];
        placeholder?: string;
        required?: boolean;
      }
    /* Renders as a yes/no toggle but leaves the payload a real boolean — a
       "false" string would be truthy to anything checking it server-side. */
    | { kind: 'boolean'; name: string; label: string; required?: boolean }
    /* Multi-select. Selections live in FieldValues as a single separator-joined
       string so the prune and required checks keep working on plain strings;
       buildPayload splits it back into an array. Option values are ours, so
       they can't contain the separator. */
    | {
        kind: 'checkboxes';
        name: string;
        label: string;
        options: FieldOption[];
        required?: boolean;
      }
    /* Value ends up a full data: URI (read client-side via FileReader), not
       just the filename — real content, so it can actually be sent to and
       rendered back from the backend. maxSizeMB rejects a picked file
       up-front rather than letting a huge one fail on submit. */
    | { kind: 'file'; name: string; label: string; accept?: string; required?: boolean; maxSizeMB?: number }
    /* Static copy, not an input — carries no value and never reaches the
       payload. Sits in the field list so it can appear and disappear with the
       request type like everything else. */
    | {
        kind: 'notice';
        name: string;
        text: string;
        steps?: string[];
        footer?: string;
      }
  );

/* Raw DOM input values — always strings. `buildPayload` converts them. */
export type FieldValues = Record<string, string>;
export type FieldPayload = Record<string, string | number | boolean | string[]>;

const MULTI_SEPARATOR = '\u001F';

interface FormDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  /* A function when later fields depend on earlier answers — the request form
     swaps its whole body based on the chosen request type. */
  fields: FieldDef[] | ((values: FieldValues) => FieldDef[]);
  /* Omitted while a form has nowhere to submit to, which disables the submit
     button rather than letting it close as though it saved. May return a
     promise — the dialog waits for it and only closes on success, showing
     a thrown Error's message inline otherwise. */
  onSubmit?: (payload: FieldPayload) => void | Promise<void>;
  onClose: () => void;
  onBack: () => void;
}

const BOOLEAN_OPTIONS: FieldOption[] = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const inputStyles =
  'w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]';

/* A `datetime` input yields a naive "2026-09-12T10:00" with no offset. Parsing
   it as local time and emitting ISO pins it to a real instant, so a timestamp
   column can't drift between the user's timezone and the server's. A `date`
   stays a plain YYYY-MM-DD — a calendar date shouldn't shift across zones. */
function buildPayload(fields: FieldDef[], values: FieldValues): FieldPayload {
  const payload: FieldPayload = {};

  for (const field of fields) {
    const raw = values[field.name];
    if (raw === undefined || raw === '') continue;

    if (field.kind === 'number') {
      payload[field.name] = Number(raw);
    } else if (field.kind === 'boolean') {
      payload[field.name] = raw === 'true';
    } else if (field.kind === 'checkboxes') {
      payload[field.name] = raw.split(MULTI_SEPARATOR);
    } else if (field.kind === 'datetime') {
      payload[field.name] = new Date(raw).toISOString();
    } else {
      payload[field.name] = raw;
    }
  }

  return payload;
}

export default function FormDialog({
  open,
  title,
  submitLabel,
  fields,
  onSubmit,
  onClose,
  onBack,
}: FormDialogProps) {
  const [values, setValues] = useState<FieldValues>({});
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const resolvedFields = typeof fields === 'function' ? fields(values) : fields;
  const shownNames = resolvedFields.map((field) => field.name).join('\n');

  /* Changing request type swaps the field set, so drop anything no longer on
     screen. A file input is uncontrolled and remounts empty, so a leftover
     filename would let validation pass with nothing actually attached — and
     the payload would carry fields belonging to the previous type. */
  useEffect(() => {
    const shown = new Set(shownNames.split('\n'));
    const prune = <T,>(prev: Record<string, T>): Record<string, T> => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([name]) => shown.has(name)),
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    };

    setValues(prune);
    setMissing(prune);
    setFileErrors(prune);
  }, [shownNames]);

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setMissing((prev) => (prev[name] ? { ...prev, [name]: false } : prev));
  }

  /* Reads the picked file as a data: URI (base64) rather than just grabbing
     its name — this is what lets the payload actually carry real content
     through to the backend instead of a filename nobody can do anything
     with. Rejects up-front (clearing the field) if it's over maxSizeMB,
     rather than letting a huge payload fail later on submit. */
  function handleFileChange(field: { name: string; maxSizeMB?: number }, file: File | undefined) {
    if (!file) {
      setValue(field.name, '');
      setFileErrors((prev) => ({ ...prev, [field.name]: '' }));
      return;
    }
    if (field.maxSizeMB && file.size > field.maxSizeMB * 1024 * 1024) {
      setValue(field.name, '');
      setFileErrors((prev) => ({ ...prev, [field.name]: `File is too large — max ${field.maxSizeMB}MB` }));
      return;
    }

    setFileErrors((prev) => ({ ...prev, [field.name]: '' }));
    const reader = new FileReader();
    reader.onload = () => {
      setValue(field.name, typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      setFileErrors((prev) => ({ ...prev, [field.name]: 'Failed to read file' }));
    };
    reader.readAsDataURL(file);
  }

  function toggleMulti(name: string, option: string) {
    const selected = values[name] ? values[name].split(MULTI_SEPARATOR) : [];
    const next = selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option];
    setValue(name, next.join(MULTI_SEPARATOR));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    /* Pressing Enter in a field submits the form even while the button is
       disabled, so the missing-handler case is guarded here too. */
    if (!onSubmit || submitting) return;

    /* The form is noValidate: the custom dropdown and segmented toggle render
       as buttons, which the browser can't validate, so every field is checked
       here instead to keep one consistent error style. Only visible fields
       count — switching request type swaps which ones are required. */
    const empty = resolvedFields.filter(
      (field) =>
        field.kind !== 'notice' && field.required && !values[field.name]?.trim(),
    );

    if (empty.length > 0) {
      setMissing(Object.fromEntries(empty.map((field) => [field.name, true])));
      return;
    }

    // A rejected (too-large/unreadable) file leaves its field empty with an
    // error still showing — don't let a non-required field silently submit
    // without it while that error is still on screen.
    if (Object.values(fileErrors).some((message) => message)) {
      return;
    }

    setSubmitError('');
    setSubmitting(true);
    try {
      await onSubmit(buildPayload(resolvedFields, values));
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} title={title} size="2xl" onClose={onClose} onBack={onBack}>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        {/* Only the fields scroll, so Cancel/Submit stay put on a long form.
            Select portals its dropdown out of here — this is a scroll
            container, which would otherwise clip it. */}
        {/* Symmetric padding: overflow-y clips the x-axis too, so focus rings
            need room on both sides, not just the scrollbar's side. */}
        <div className="-mx-2 max-h-[68vh] overflow-y-auto px-2">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {resolvedFields.map((field) => {
          if (field.kind === 'notice') {
            return (
              <div
                key={field.name}
                className="text-sm leading-relaxed text-gray-500 sm:col-span-2"
              >
                <p>{field.text}</p>
                {field.steps && (
                  <ol className="mt-1.5 list-decimal space-y-1 pl-5">
                    {field.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                )}
                {field.footer && <p className="mt-1.5">{field.footer}</p>}
              </div>
            );
          }

          /* Only wrap real form controls in a label — a label would forward
             clicks on a dropdown option back to the toggle button. */
          const isChoice =
            field.kind === 'select' ||
            field.kind === 'segmented' ||
            field.kind === 'boolean' ||
            field.kind === 'checkboxes';
          const Wrapper = isChoice ? 'div' : 'label';
          const span = field.span === 'half' ? '' : 'sm:col-span-2';
          const invalid = missing[field.name] === true;
          const controlStyles = invalid ? `${inputStyles} ring-2 ring-[#ED6672]` : inputStyles;

          return (
            <Wrapper key={field.name} className={`flex min-w-0 flex-col gap-1.5 ${span}`}>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {field.label}
                {field.required && <span className="text-[#ED6672]"> *</span>}
              </span>

              {field.kind === 'textarea' ? (
                <textarea
                  rows={3}
                  required={field.required}
                  aria-invalid={invalid}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  className={`${controlStyles} resize-none`}
                />
              ) : field.kind === 'select' ? (
                <Select
                  value={values[field.name] ?? ''}
                  options={field.options}
                  placeholder={field.placeholder}
                  required={field.required}
                  invalid={invalid}
                  onChange={(value) => setValue(field.name, value)}
                />
              ) : field.kind === 'boolean' || field.kind === 'segmented' ? (
                <div
                  role="radiogroup"
                  aria-required={field.required}
                  aria-invalid={invalid}
                  className={`flex gap-2 rounded-lg ${invalid ? 'ring-2 ring-[#ED6672]' : ''}`}
                >
                  {(field.kind === 'boolean' ? BOOLEAN_OPTIONS : field.options).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={values[field.name] === option.value}
                      onClick={() => setValue(field.name, option.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                        values[field.name] === option.value
                          ? 'border-[#B1C9DC] bg-[#B1C9DC]/20 text-gray-900'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : field.kind === 'checkboxes' ? (
                <div
                  role="group"
                  aria-required={field.required}
                  aria-invalid={invalid}
                  className={`grid gap-x-5 gap-y-0.5 sm:grid-cols-2 ${
                    invalid ? 'rounded-lg p-1 ring-2 ring-[#ED6672]' : ''
                  }`}
                >
                  {field.options.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-gray-900 transition-colors hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={(values[field.name] ?? '')
                          .split(MULTI_SEPARATOR)
                          .includes(option.value)}
                        onChange={() => toggleMulti(field.name, option.value)}
                        className="h-4 w-4 shrink-0 cursor-pointer accent-[#3D6C94]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : field.kind === 'file' ? (
                <input
                  type="file"
                  accept={field.accept}
                  required={field.required}
                  aria-invalid={invalid || Boolean(fileErrors[field.name])}
                  onChange={(e) => handleFileChange(field, e.target.files?.[0])}
                  className={`${controlStyles} file:mr-3 file:rounded-md file:border-0 file:bg-[#B1C9DC] file:px-3 file:py-1 file:text-xs file:font-bold file:text-white`}
                />
              ) : (
                <input
                  type={
                    field.kind === 'datetime'
                      ? 'datetime-local'
                      : field.kind === 'date'
                        ? 'date'
                        : field.kind
                  }
                  required={field.required}
                  aria-invalid={invalid}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ''}
                  onChange={(e) => setValue(field.name, e.target.value)}
                  className={controlStyles}
                />
              )}

              {fileErrors[field.name] ? (
                <span role="alert" className="text-xs font-bold text-[#ED6672]">
                  {fileErrors[field.name]}
                </span>
              ) : invalid ? (
                <span role="alert" className="text-xs font-bold text-[#ED6672]">
                  {field.label} is required
                </span>
              ) : null}
            </Wrapper>
          );
        })}
        </div>
        </div>

        {submitError && (
          <p role="alert" className="text-xs font-bold text-[#ED6672]">
            {submitError}
          </p>
        )}

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!onSubmit || submitting}
            className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#B1C9DC] disabled:hover:shadow-sm disabled:active:scale-100"
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
