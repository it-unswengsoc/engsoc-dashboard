'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, X } from 'lucide-react';

/* Spelled out rather than interpolated so Tailwind can see each class. */
const MAX_WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
} as const;

interface DialogProps {
  open: boolean;
  title: string;
  size?: keyof typeof MAX_WIDTHS;
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
  const releasedOutside = useRef(false);

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

  /* A Select portals its dropdown to <body> to escape the dialog's scrolling
     field area, so the list sits outside the card. Without exempting it, picking
     an option would read as a backdrop click and close the whole dialog. */
  const outsideCard = (target: EventTarget | null) => {
    const node = target as Node | null;
    if (node && cardRef.current?.contains(node)) return false;
    const element = node instanceof Element ? node : (node?.parentElement ?? null);
    return !element?.closest('[data-dialog-popover]');
  };

  return createPortal(
    /* Portalled to <body> because the header is `sticky z-10`, and a sticky
       element with a z-index creates a stacking context — nested inside it,
       this overlay's z-50 is only compared against the header's contents, so
       the calendar's own sticky header would paint over it. */
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/15"
      /* A click is dispatched to the common ancestor of press and release, so
         a drag between the card and the backdrop — in either direction — lands
         on the overlay and would otherwise read as a backdrop click, discarding
         a filled-in form. Both ends of the press have to be outside the card. */
      onMouseDown={(e) => {
        pressStartedOutside.current = outsideCard(e.target);
      }}
      onMouseUp={(e) => {
        releasedOutside.current = outsideCard(e.target);
      }}
      onClick={() => {
        const clickedBackdrop = pressStartedOutside.current && releasedOutside.current;
        pressStartedOutside.current = false;
        releasedOutside.current = false;
        if (clickedBackdrop) onClose();
      }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={cardRef}
          className={`relative w-full animate-dialog-in rounded-2xl bg-white p-8 shadow-xl motion-reduce:animate-none ${MAX_WIDTHS[size]}`}
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
