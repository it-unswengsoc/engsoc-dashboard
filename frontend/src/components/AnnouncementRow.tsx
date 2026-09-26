'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { AnnouncementItem, AnnouncementComment } from '@/types/announcements';
import {
  likeAnnouncement,
  unlikeAnnouncement,
  getComments,
  addComment,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/services/announcements-api';
import { getDirectory } from '@/services/users-api';
import { getProfile } from '@/services/auth-api';
import type { DirectoryUser } from '@/types/directory';
import type { Profile } from '@/types/auth';
import { roleLabel } from '@/lib/roles';
import MentionText from '@/components/MentionText';
import MentionTextarea from '@/components/MentionTextarea';
import AnnouncementComposer from '@/components/announcements/AnnouncementComposer';
import Dialog from '@/components/dialogs/Dialog';

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

function PostMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Post options"
        className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil className="h-3.5 w-3.5 text-[#3D6C94]" />
            Edit
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold text-[#8B2E38] transition-colors hover:bg-[#F1C4C9]/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmDeleteDialog({
  open,
  onConfirm,
  onClose,
}: {
  open: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
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
    <Dialog open={open} title="Delete announcement" size="sm" onClose={onClose}>
      <div className="mt-5 flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          This can&apos;t be undone — the post, its likes and its comments will all be gone for everyone.
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
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Dialog>
  );
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

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-end gap-2">
      <MentionTextarea
        value={value}
        onChange={setValue}
        directory={directory}
        rows={3}
        placeholder="Write a comment... @Name or @Portfolio to tag someone"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
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
  );
}

interface AnnouncementRowProps extends AnnouncementItem {
  onDeleted?: (id: number) => void;
}

export default function AnnouncementRow({ onDeleted, ...announcement }: AnnouncementRowProps) {
  const router = useRouter();
  const { id, authorId, authorName, authorRole, createdAt } = announcement;

  const [content, setContent] = useState(announcement.content);
  const [imageUrl, setImageUrl] = useState(announcement.imageUrl);

  const [likeCount, setLikeCount] = useState(announcement.likeCount);
  const [isLiked, setIsLiked] = useState(announcement.isLikedByMe);
  const [likeBusy, setLikeBusy] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<AnnouncementComment[] | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(announcement.commentCount);
  const [directory, setDirectory] = useState<DirectoryUser[] | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    getProfile(token).then(setProfile).catch(() => {});
  }, []);

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

  async function handleEditSubmit(input: { content: string; imageUrl?: string | null }) {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const updated = await updateAnnouncement(token, id, input);
    setContent(updated.content);
    setImageUrl(updated.imageUrl);
  }

  async function handleDelete() {
    const token = sessionStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    await deleteAnnouncement(token, id);
    onDeleted?.(id);
  }

  const canEdit = profile !== null && (profile.id === authorId || profile.role === 'admin');

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
        {canEdit && <PostMenu onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />}
      </div>

      {/* Announcement image */}
      {imageUrl && (
        <div className="aspect-video w-full overflow-hidden">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

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

      <AnnouncementComposer
        open={editing}
        mode="edit"
        initial={{ content, imageUrl }}
        onSubmit={handleEditSubmit}
        onClose={() => setEditing(false)}
      />

      <ConfirmDeleteDialog open={deleting} onConfirm={handleDelete} onClose={() => setDeleting(false)} />
    </div>
  );
}
