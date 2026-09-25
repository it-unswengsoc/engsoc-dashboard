'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Image as ImageIcon } from 'lucide-react';
import Dialog from '@/components/dialogs/Dialog';
import MentionTextarea from '@/components/MentionTextarea';
import MentionText from '@/components/MentionText';
import { getDirectory } from '@/services/users-api';
import { getProfile } from '@/services/auth-api';
import type { DirectoryUser } from '@/types/directory';
import type { Profile } from '@/types/auth';
import { roleLabel } from '@/lib/roles';
import { getCroppedImageDataUrl } from '@/lib/image-crop';

const CROP_ASPECT = 16 / 9;
const MAX_IMAGE_MB = 2;

type ImageState =
  | { kind: 'none' }
  | { kind: 'unchanged'; url: string } // edit mode: the original stored image, untouched so far
  | { kind: 'picked'; src: string }; // a newly-picked file, being cropped (src is a blob: object URL)

export interface AnnouncementComposerProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: { content: string; imageUrl: string | null };
  /* imageUrl: undefined leaves it untouched (edit, image not touched),
     null clears it, a string is the new (already cropped) image. */
  onSubmit: (input: { content: string; imageUrl?: string | null }) => Promise<void>;
  onClose: () => void;
}

function initialsOf(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/* Two steps: compose (caption + pick/crop an image) then preview (exactly
   what the post will look like in the feed, using the real signed-in
   member's name/role) before it actually goes out. Used both for posting a
   new announcement and for editing an existing one — mode/initial decide
   which. */
export default function AnnouncementComposer({ open, mode, initial, onSubmit, onClose }: AnnouncementComposerProps) {
  const [step, setStep] = useState<'compose' | 'preview'>('compose');
  const [caption, setCaption] = useState('');
  const [captionMissing, setCaptionMissing] = useState(false);
  const [imageState, setImageState] = useState<ImageState>({ kind: 'none' });
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null | undefined>(undefined);
  const [directory, setDirectory] = useState<DirectoryUser[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset to a clean slate on every *re*-open, same reasoning as
  // NewItemDialog's own reset-on-reopen (Dialog plays an exit animation
  // before unmounting, so this instance is still alive to reset).
  useEffect(() => {
    if (!open) return;
    setStep('compose');
    setCaption(initial?.content ?? '');
    setCaptionMissing(false);
    setImageState(initial?.imageUrl ? { kind: 'unchanged', url: initial.imageUrl } : { kind: 'none' });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPreviewImageUrl(undefined);
    setError('');

    const token = sessionStorage.getItem('token');
    if (token) {
      getDirectory(token).then(setDirectory).catch(() => {});
      getProfile(token).then(setProfile).catch(() => {});
    }
    // Only reset when the dialog opens, not on every prop identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Object URLs from a picked file need explicit cleanup — revoke the
  // previous one whenever it stops being current (a new file replaces it,
  // it's removed, or the dialog closes) so they don't pile up.
  useEffect(() => {
    return () => {
      if (imageState.kind === 'picked') URL.revokeObjectURL(imageState.src);
    };
  }, [imageState]);

  function handlePickFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image is too large — max ${MAX_IMAGE_MB}MB`);
      return;
    }
    setError('');
    setImageState({ kind: 'picked', src: URL.createObjectURL(file) });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handleRemoveImage() {
    setImageState({ kind: 'none' });
    setCroppedAreaPixels(null);
  }

  async function handleGoToPreview() {
    const trimmed = caption.trim();
    if (!trimmed) {
      setCaptionMissing(true);
      return;
    }
    setCaptionMissing(false);
    setError('');

    if (imageState.kind === 'picked') {
      if (!croppedAreaPixels) {
        setError('Still preparing the image — try again in a second.');
        return;
      }
      try {
        setPreviewImageUrl(await getCroppedImageDataUrl(imageState.src, croppedAreaPixels));
      } catch {
        setError('Failed to process that image — try a different file.');
        return;
      }
    } else if (imageState.kind === 'unchanged') {
      setPreviewImageUrl(undefined); // not touching the existing image
    } else {
      // 'none' — only a real "clear" worth sending if there was one to begin with
      setPreviewImageUrl(mode === 'edit' && initial?.imageUrl ? null : undefined);
    }

    setStep('preview');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ content: caption.trim(), imageUrl: previewImageUrl });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const previewDisplayImage =
    previewImageUrl === undefined ? (imageState.kind === 'unchanged' ? imageState.url : null) : previewImageUrl;

  return (
    <Dialog
      open={open}
      title={mode === 'create' ? 'New announcement' : 'Edit announcement'}
      size="2xl"
      onClose={onClose}
      onBack={step === 'preview' ? () => setStep('compose') : undefined}
    >
      {step === 'compose' ? (
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Caption <span className="text-[#ED6672]">*</span>
            </span>
            <MentionTextarea
              value={caption}
              onChange={(v) => {
                setCaption(v);
                if (v.trim()) setCaptionMissing(false);
              }}
              directory={directory}
              rows={4}
              placeholder="What's the announcement? @Name or @Portfolio to tag someone"
              className={`w-full resize-none rounded-lg border border-transparent bg-gray-100 px-3 py-2 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B1C9DC] ${
                captionMissing ? 'ring-2 ring-[#ED6672]' : ''
              }`}
            />
            {captionMissing && (
              <span role="alert" className="text-xs font-bold text-[#ED6672]">
                Caption is required
              </span>
            )}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Image (optional)</span>

            {imageState.kind === 'none' ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm font-bold text-gray-400 transition-colors hover:border-[#B1C9DC] hover:text-[#3D6C94]">
                <ImageIcon className="h-5 w-5" />
                Add a photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePickFile(e.target.files?.[0])}
                />
              </label>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="relative h-56 w-full overflow-hidden rounded-xl bg-gray-900">
                  <Cropper
                    image={imageState.kind === 'picked' ? imageState.src : imageState.url}
                    crop={crop}
                    zoom={zoom}
                    aspect={CROP_ASPECT}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-[#3D6C94]"
                  />
                  <label className="shrink-0 cursor-pointer text-xs font-bold text-[#3D6C94] hover:text-[#2A4A63]">
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePickFile(e.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="shrink-0 text-xs font-bold text-[#8B2E38] hover:text-[#6f2530]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs font-bold text-[#ED6672]">
              {error}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGoToPreview}
              className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98]"
            >
              Preview
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-gray-400">
            This is exactly how it'll look
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B1C9DC] text-xs font-bold text-white">
                {initialsOf(profile ? `${profile.firstName} ${profile.lastName}` : null)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">
                  {profile ? `${profile.firstName} ${profile.lastName}` : '…'}{' '}
                  <span className="text-gray-400">|</span> {profile ? roleLabel(profile.role) : ''}
                </p>
                <p className="font-mono text-[10px] text-gray-400">just now</p>
              </div>
            </div>

            {previewDisplayImage && (
              <div className="aspect-video w-full overflow-hidden">
                <img src={previewDisplayImage} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="px-5 py-4">
              <p className="font-mono text-sm leading-relaxed text-gray-800">
                <MentionText content={caption} />
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-bold text-[#ED6672]">
              {error}
            </p>
          )}

          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setStep('compose')}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back to edit
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-[#B1C9DC] py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#9db8cd] hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Saving…' : mode === 'create' ? 'Post' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
