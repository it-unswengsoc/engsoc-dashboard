'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import type { DirectoryUser } from '@/types/directory';
import { matchMentionCandidates, type MentionCandidate } from '@/lib/mentions';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  directory: DirectoryUser[] | null;
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

/* A plain textarea with a live "@" autocomplete dropdown — shared by the
   comment composer and the announcement composer. Only the trailing "@word"
   is matched (not a mention typed mid-sentence then edited around), a
   deliberate simplification — see lib/mentions.ts for the real, exact
   resolution this is just a typing aid for. */
export default function MentionTextarea({
  value,
  onChange,
  directory,
  placeholder,
  rows = 1,
  className,
  onKeyDown,
}: MentionTextareaProps) {
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function updateCandidates(next: string) {
    const trailing = next.match(/@([A-Za-z]*)$/);
    if (!trailing || !directory) {
      setCandidates([]);
      return;
    }
    setCandidates(matchMentionCandidates(trailing[1], directory));
  }

  function pick(candidate: MentionCandidate) {
    onChange(value.replace(/@([A-Za-z]*)$/, `@${candidate.insertText} `));
    setCandidates([]);
    textareaRef.current?.focus();
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          updateCandidates(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setCandidates([]);
          onKeyDown?.(e);
        }}
        className={className}
      />

      {candidates.length > 0 && (
        <ul className="absolute bottom-full left-0 z-10 mb-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {candidates.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-gray-900 transition-colors hover:bg-[#B1C9DC]/20"
              >
                <span className="font-bold">{c.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-gray-400">{c.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
