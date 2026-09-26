'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Dialog from '@/components/dialogs/Dialog';

interface NamePromptDialogProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValue?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

/* One small reusable dialog for anything that's just "type a name, submit
   it" — creating a folder, creating a blank Doc/Sheet/Slides, or renaming
   an existing file/folder. */
export default function NamePromptDialog({ open, title, submitLabel, initialValue = '', onSubmit, onClose }: NamePromptDialogProps) {
  const [name, setName] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialValue);
      setError('');
    }
  }, [open, initialValue]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} title={title} size="sm" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]"
        />

        {error && (
          <p role="alert" className="text-xs font-bold text-[#ED6672]">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
