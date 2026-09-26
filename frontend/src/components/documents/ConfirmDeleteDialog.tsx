'use client';

import { useState } from 'react';
import Dialog from '@/components/dialogs/Dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  itemName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/* Delete moves a file/folder to Drive's own Trash (see
   backend/src/functions/drive.ts's deleteDriveEntry) rather than permanently
   deleting it — recoverable there for 30 days, the same outcome as choosing
   "Remove" in Drive's own UI. This confirmation step is a speed bump against
   a misclick, not the only thing standing between a member and losing
   something for good. */
export default function ConfirmDeleteDialog({ open, itemName, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} title="Move to trash" size="sm" onClose={onClose}>
      <div className="mt-5 flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Move <span className="font-bold text-gray-900">{itemName}</span> to Drive&apos;s trash? It stays
          recoverable there, same as deleting it in Drive itself.
        </p>

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
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[#8B2E38] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#792636] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Moving…' : 'Move to trash'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
