'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Dialog from '@/components/dialogs/Dialog';
import Select, { type FieldOption } from '@/components/dialogs/Select';

export type { FieldOption };

export type FieldDef =
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
  | { kind: 'file'; name: string; label: string; accept?: string; required?: boolean };

/* Raw DOM input values — always strings. `buildPayload` converts them. */
export type FieldValues = Record<string, string>;
export type FieldPayload = Record<string, string | number>;

interface FormDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  /* A function when later fields depend on earlier answers — the request form
     swaps its whole body based on the chosen request type. */
  fields: FieldDef[] | ((values: FieldValues) => FieldDef[]);
  onSubmit: (payload: FieldPayload) => void;
  onClose: () => void;
  onBack: () => void;
}

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
  }, [shownNames]);

  function setValue(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setMissing((prev) => (prev[name] ? { ...prev, [name]: false } : prev));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    /* The form is noValidate: the custom dropdown and segmented toggle render
       as buttons, which the browser can't validate, so every field is checked
       here instead to keep one consistent error style. Only visible fields
       count — switching request type swaps which ones are required. */
    const empty = resolvedFields.filter(
      (field) => field.required && !values[field.name]?.trim(),
    );

    if (empty.length > 0) {
      setMissing(Object.fromEntries(empty.map((field) => [field.name, true])));
      return;
    }

    onSubmit(buildPayload(resolvedFields, values));
    onClose();
  }

  return (
    <Dialog open={open} title={title} onClose={onClose} onBack={onBack}>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
        {resolvedFields.map((field) => {
          /* Only wrap real form controls in a label — a label would forward
             clicks on a dropdown option back to the toggle button. */
          const Wrapper =
            field.kind === 'select' || field.kind === 'segmented' ? 'div' : 'label';
          const invalid = missing[field.name] === true;
          const controlStyles = invalid ? `${inputStyles} ring-2 ring-[#ED6672]` : inputStyles;

          return (
            <Wrapper key={field.name} className="flex flex-col gap-1.5">
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
              ) : field.kind === 'segmented' ? (
                <div
                  role="radiogroup"
                  aria-required={field.required}
                  aria-invalid={invalid}
                  className={`flex gap-2 rounded-lg ${invalid ? 'ring-2 ring-[#ED6672]' : ''}`}
                >
                  {field.options.map((option) => (
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
              ) : field.kind === 'file' ? (
                <input
                  type="file"
                  accept={field.accept}
                  required={field.required}
                  aria-invalid={invalid}
                  onChange={(e) => setValue(field.name, e.target.files?.[0]?.name ?? '')}
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

              {invalid && (
                <span role="alert" className="text-xs font-bold text-[#ED6672]">
                  {field.label} is required
                </span>
              )}
            </Wrapper>
          );
        })}

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
            className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98]"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
