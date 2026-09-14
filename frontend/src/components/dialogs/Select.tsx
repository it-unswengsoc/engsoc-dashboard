'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

/* `value` is the stable identifier the API receives; `label` is display copy
   and can be reworded without changing any payload. */
export interface FieldOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: FieldOption[];
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}

interface Position {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const LIST_MAX_HEIGHT = 224;
const GAP = 4;
const VIEWPORT_MARGIN = 8;

function positionFor(trigger: HTMLElement): Position {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;

  return openUp
    ? {
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top + GAP,
        maxHeight: Math.min(LIST_MAX_HEIGHT, spaceAbove),
      }
    : {
        left: rect.left,
        width: rect.width,
        top: rect.bottom + GAP,
        maxHeight: Math.min(LIST_MAX_HEIGHT, spaceBelow),
      };
}

export default function Select({
  value,
  options,
  placeholder = 'Select an option...',
  required,
  invalid,
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    if (triggerRef.current) setPosition(positionFor(triggerRef.current));
  }, []);

  useEffect(() => {
    if (!open) return;

    const insideSelect = (target: Node | null) =>
      triggerRef.current?.contains(target) || listRef.current?.contains(target);

    const handlePointerDown = (e: MouseEvent) => {
      if (!insideSelect(e.target as Node)) setOpen(false);
    };
    /* Capture phase so Escape closes only this dropdown — the dialog's own
       Escape handler sits on window and would otherwise close everything. */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown, true);
    /* Capture, so scrolling the dialog's own field area moves the list too —
       it's fixed to the viewport, not to the trigger. */
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  function toggle() {
    if (!open) reposition();
    setOpen((prev) => !prev);
  }

  /* The list is portalled to <body> because the dialog caps its field area and
     scrolls it — a scroll container clips absolutely positioned children, so an
     in-flow dropdown would be cut off at the fold. */
  const list = open && position && (
    <ul
      ref={listRef}
      role="listbox"
      data-dialog-popover
      style={{
        position: 'fixed',
        left: position.left,
        width: position.width,
        top: position.top,
        bottom: position.bottom,
        maxHeight: position.maxHeight,
      }}
      className="z-[60] overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      {options.map((option) => (
        <li key={option.value}>
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#B1C9DC]/20 ${
              option.value === value ? 'font-bold text-gray-900' : 'text-gray-700'
            }`}
          >
            {option.label}
            {option.value === value && <Check className="h-4 w-4 shrink-0 text-[#3D6C94]" />}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        aria-invalid={invalid}
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-2 rounded-lg bg-gray-100 px-3 py-2 text-left text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC] ${
          selected ? 'text-gray-900' : 'text-gray-400'
        } ${invalid ? 'ring-2 ring-[#ED6672]' : ''}`}
      >
        {selected?.label ?? placeholder}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {mounted && list ? createPortal(list, document.body) : null}
    </div>
  );
}
