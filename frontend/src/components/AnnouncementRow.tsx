'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle } from 'lucide-react';
import type { AnnouncementItem, AnnouncementComment } from '@/types/announcements';
import {
  likeAnnouncement,
  unlikeAnnouncement,
  getComments,
  addComment,
} from '@/services/announcements-api';
import { getDirectory } from '@/services/users-api';
import type { DirectoryUser } from '@/types/directory';
import { roleLabel } from '@/lib/roles';
import { matchMentionCandidates, type MentionCandidate } from '@/lib/mentions';
import MentionText from '@/components/MentionText';

function initialsOf(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString();
}

function CommentComposer({
  directory,
  onSubmit,
}: {
  directory: DirectoryUser[] | null;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Only the trailing "@word" is matched (not a mention typed mid-sentence
     then edited around) — a deliberate simplification, see lib/mentions.ts. */
  function updateCandidates(next: string) {
    const trailing = next.match(/@([A-Za-z]*)$/);
    if (!trailing || !directory) {
      setCandidates([]);
      return;
    }
    setCandidates(matchMentionCandidates(trailing[1], directory));
  }

  function pick(candidate: MentionCandidate) {
    const next = value.replace(/@([A-Za-z]*)$/, `@${candidate.insertText} `);
    setValue(next);
    setCandidates([]);
    textareaRef.current?.focus();
  }

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue('');
      setCandidates([]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            updateCandidates(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
            if (e.key === 'Escape') setCandidates([]);
          }}
          placeholder="Write a comment... @Name or @Portfolio to tag someone"
          className="min-w-0 flex-1 resize-none rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC]"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || submitting}
          className="shrink-0 rounded-lg bg-[#B1C9DC] px-3 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? '...' : 'Post'}
        </button>
      </div>

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

export default function AnnouncementRow(announcement: AnnouncementItem) {
  const router = useRouter();
  const { id, authorName, authorRole, content, imageUrl, createdAt } = announcement;

  const [likeCount, setLikeCount] = useState(announcement.likeCount);
  const [isLiked, setIsLiked] = useState(announcement.isLikedByMe);
  const [likeBusy, setLikeBusy] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<AnnouncementComment[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(announcement.commentCount);
  const [directory, setDirectory] = useState<DirectoryUser[] | null>(null);

  useEffect(() => {
    if (!commentsOpen) return;
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (comments === null) {
      setCommentsLoading(true);
      getComments(token, id)
        .then(setComments)
        .finally(() => setCommentsLoading(false));
    }
    if (directory === null) {
      getDirectory(token).then(setDirectory).catch(() => setDirectory([]));
    }
  }, [commentsOpen, comments, directory, id, router]);

  async function toggleLike() {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (likeBusy) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked); // optimistic
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLikeBusy(true);
    try {
      const updated = wasLiked ? await unlikeAnnouncement(token, id) : await likeAnnouncement(token, id);
      setIsLiked(updated.isLikedByMe);
      setLikeCount(updated.likeCount);
    } catch {
      setIsLiked(wasLiked); // roll back
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleAddComment(text: string) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const comment = await addComment(token, id, text);
    setComments((prev) => [...(prev ?? []), comment]);
    setCommentCount((c) => c + 1);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Poster header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B1C9DC] text-xs font-bold text-white">
          {initialsOf(authorName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">
            {authorName ?? 'Deleted member'} <span className="text-gray-400">|</span>{' '}
            {authorRole ? roleLabel(authorRole) : 'Member'}
          </p>
          <p className="font-mono text-[10px] text-gray-400">{timeAgo(createdAt)}</p>
        </div>
      </div>

      {/* Announcement image */}
      {imageUrl && <img src={imageUrl} alt="" className="w-full object-cover" />}

      {/* Content */}
      <div className="px-5 py-4">
        <p className="font-mono text-sm leading-relaxed text-gray-800">
          <MentionText content={content} />
        </p>
      </div>

      {/* Like / comment bar */}
      <div className="flex items-center gap-4 border-t border-gray-100 px-5 py-2.5">
        <button
          onClick={toggleLike}
          disabled={likeBusy}
          className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${
            isLiked ? 'text-[#ED6672]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Heart className="h-4 w-4" fill={isLiked ? 'currentColor' : 'none'} />
          {likeCount}
        </button>

        <button
          onClick={() => setCommentsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-sm font-bold text-gray-400 transition-colors hover:text-gray-600"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount}
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <div className="flex flex-col gap-3">
            {commentsLoading ? (
              <p className="font-mono text-xs text-gray-400">Loading comments…</p>
            ) : comments && comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B1C9DC] text-[10px] font-bold text-white">
                    {initialsOf(c.authorName)}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 shadow-sm">
                    <p className="text-xs font-bold text-gray-900">{c.authorName ?? 'Deleted member'}</p>
                    <p className="text-sm text-gray-700">
                      <MentionText content={c.content} />
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="font-mono text-xs text-gray-400">No comments yet — be the first to reply.</p>
            )}

            <CommentComposer directory={directory} onSubmit={handleAddComment} />
          </div>
        </div>
      )}
    </div>
  );
}
