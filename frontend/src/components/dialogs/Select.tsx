'use client';

import { useEffect, useRef, useState } from 'react';
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

export default function Select({
  value,
  options,
  placeholder = 'Select an option...',
  required,
  invalid,
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
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
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        aria-invalid={invalid}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg bg-gray-100 px-3 py-2 text-left text-sm transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC] ${
          selected ? 'text-gray-900' : 'text-gray-400'
        } ${invalid ? 'ring-2 ring-[#ED6672]' : ''}`}
      >
        {selected?.label ?? placeholder}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
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
                {option.value === value && (
                  <Check className="h-4 w-4 shrink-0 text-[#3D6C94]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
