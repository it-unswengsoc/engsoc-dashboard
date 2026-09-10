'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const pressStartedOutside = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  /* createPortal needs a real document, which the server render doesn't have. */
  if (!open || !mounted) return null;

  const outsideCard = (target: EventTarget | null) =>
    !cardRef.current?.contains(target as Node);

  return createPortal(
    /* Portalled to <body> because the header is `sticky z-10`, and a sticky
       element with a z-index creates a stacking context — nested inside it,
       this overlay's z-50 is only compared against the header's contents, so
       the calendar's own sticky header would paint over it. */
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/15"
      /* A click is dispatched to the common ancestor of press and release, so
         dragging a text selection from an input out onto the backdrop would
         otherwise read as a backdrop click and discard the whole form. */
      onMouseDown={(e) => {
        pressStartedOutside.current = outsideCard(e.target);
      }}
      onClick={(e) => {
        if (pressStartedOutside.current && outsideCard(e.target)) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={cardRef}
          className={`relative w-full animate-dialog-in rounded-2xl bg-white p-8 shadow-xl motion-reduce:animate-none ${
            size === 'sm' ? 'max-w-sm' : 'max-w-md'
          }`}
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
    </div>,
    document.body,
  );
}
