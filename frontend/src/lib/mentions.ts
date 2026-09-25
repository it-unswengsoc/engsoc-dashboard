import type { DirectoryUser } from '@/types/directory';
import { PORT_OPTIONS } from '@/lib/ports';

/* There's no bracketed/canonical mention syntax and no server round-trip
   needed just to render one — see backend/src/functions/mentions.ts for the
   real (server-side, directory-verified) resolution used at notification
   time. This is purely cosmetic: highlight anything that *looks* like
   "@Name" or "@Name Surname" (a run of capitalized words), regardless of
   whether it actually matches a real member or portfolio. Good enough for
   display; never trusted for anything that sends a notification. */
const MENTION_PATTERN = /@[A-Z][A-Za-z]*(?:\s[A-Z][A-Za-z]*)*/g;

export type ContentSegment = { text: string; isMention: boolean };

export function splitMentions(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ text: content.slice(lastIndex, index), isMention: false });
    segments.push({ text: match[0], isMention: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < content.length) segments.push({ text: content.slice(lastIndex), isMention: false });

  return segments;
}

export interface MentionCandidate {
  key: string;
  insertText: string; // what gets appended after the "@", without the "@" itself
  label: string; // what the autocomplete row shows
  sublabel: string; // "Person" / "Portfolio"
}

/* Candidates for the live "@" autocomplete in the comment composer — every
   active member (by full name) plus every portfolio that currently has at
   least one member (by its display label), filtered by whatever's typed
   after the "@" so far. */
export function matchMentionCandidates(query: string, directory: DirectoryUser[]): MentionCandidate[] {
  const q = query.trim().toLowerCase();

  const people: MentionCandidate[] = directory.map((u) => ({
    key: `user-${u.id}`,
    insertText: `${u.firstName} ${u.lastName}`,
    label: `${u.firstName} ${u.lastName}`,
    sublabel: 'Person',
  }));

  const portsWithMembers = new Set(directory.map((u) => u.port).filter((p): p is string => p !== null));
  const ports: MentionCandidate[] = PORT_OPTIONS.filter((p) => portsWithMembers.has(p.value)).map((p) => ({
    key: `port-${p.value}`,
    insertText: p.label,
    label: p.label,
    sublabel: 'Portfolio',
  }));

  const all = [...people, ...ports];
  if (!q) return all.slice(0, 8);
  return all.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 8);
}
