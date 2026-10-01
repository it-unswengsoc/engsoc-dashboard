'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Image as ImageIcon } from 'lucide-react';
import { getCroppedImageDataUrl } from '@/lib/image-crop';

const CROP_ASPECT = 16 / 9;
// The picked file, before cropping — the upload itself is a downscaled JPEG
// (see lib/image-crop.ts). Same limits and checks as AnnouncementComposer.
const MAX_IMAGE_MB = 15;
// Browsers (outside recent Safari) can't decode HEIC/HEIF, and file.type is
// unreliable for it, so the extension is checked too.
const UNSUPPORTED_IMAGE_TYPES = ['image/heic', 'image/heif'];
const UNSUPPORTED_IMAGE_EXTENSIONS = ['.heic', '.heif'];

export type PhotoValue =
  | { kind: 'none' }
  | { kind: 'existing'; url: string } // the stored photo, untouched
  | { kind: 'picked'; file: File; previewSrc: string; area: Area | null }; // a new file, being cropped

export function initialPhoto(url: string | null | undefined): PhotoValue {
  return url ? { kind: 'existing', url } : { kind: 'none' };
}

/* What to send for a photo field: a new cropped image as a data: URI, null
   to remove a photo there was, or undefined to leave it as it is. */
export async function resolvePhoto(value: PhotoValue, hadPhoto: boolean): Promise<string | null | undefined> {
  if (value.kind === 'existing') return undefined;
  if (value.kind === 'none') return hadPhoto ? null : undefined;
  if (!value.area) throw new Error('Still preparing the photo — try again in a second.');
  return getCroppedImageDataUrl(value.file, value.area);
}

interface PhotoFieldProps {
  label: string;
  value: PhotoValue;
  onChange: (value: PhotoValue) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

/* Pick a photo and crop it to 16:9 — the shape it shows in on the
   dashboard and in the event's details. */
export default function PhotoField({ label, value, onChange, onError, disabled = false }: PhotoFieldProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // A picked file's object URL is revoked once it stops being shown.
  const previewSrc = value.kind === 'picked' ? value.previewSrc : null;
  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  function handlePick(file: File | undefined) {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (UNSUPPORTED_IMAGE_TYPES.includes(file.type) || UNSUPPORTED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      onError("HEIC/HEIF photos aren't supported by browsers yet — try saving it as a JPEG or PNG first.");
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      onError(`Photo is too large — max ${MAX_IMAGE_MB}MB`);
      return;
    }
    onError('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onChange({ kind: 'picked', file, previewSrc: URL.createObjectURL(file), area: null });
  }

  const fileInput = (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={disabled}
      onChange={(e) => {
        handlePick(e.target.files?.[0]);
        e.target.value = '';
      }}
    />
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>

      {value.kind === 'none' ? (
        <label
          className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-6 text-sm font-bold text-gray-400 transition-colors ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-[#B1C9DC] hover:text-[#3D6C94]'
          }`}
        >
          <ImageIcon className="h-5 w-5" />
          Add a photo
          {fileInput}
        </label>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
            {value.kind === 'picked' ? (
              <Cropper
                image={value.previewSrc}
                crop={crop}
                zoom={zoom}
                aspect={CROP_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, area) => onChange({ ...value, area })}
              />
            ) : (
              <img src={value.url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          {!disabled && (
            <div className="flex items-center gap-3">
              {value.kind === 'picked' ? (
                <>
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
                </>
              ) : (
                <span className="flex-1" />
              )}
              <label className="shrink-0 cursor-pointer text-xs font-bold text-[#3D6C94] hover:text-[#2A4A63]">
                Change
                {fileInput}
              </label>
              <button
                type="button"
                onClick={() => onChange({ kind: 'none' })}
                className="shrink-0 text-xs font-bold text-[#8B2E38] hover:text-[#6f2530]"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
