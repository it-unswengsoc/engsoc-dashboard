'use client';

import { useEffect, type ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  title: string;
  size?: 'sm' | 'md';
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
}

export default function Dialog({
  open,
  title,
  size = 'md',
  onClose,
  onBack,
  children,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    /* The backdrop scrolls rather than the card — a scroll container clips
       absolutely positioned children, which would cut off open dropdowns. */
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/15" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative w-full animate-dialog-in rounded-2xl bg-white p-8 shadow-xl motion-reduce:animate-none ${
            size === 'sm' ? 'max-w-sm' : 'max-w-md'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 pr-8">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back"
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
