import type { Area } from 'react-easy-crop';

/* Every image this ever loads is either a blob: URL from a just-picked
   local file or a data: URI from an already-stored announcement image —
   never a genuine cross-origin http(s) URL. Setting crossOrigin on an <img>
   requests CORS validation from the browser, which blob:/data: sources
   don't actually need and which some browser versions handle
   inconsistently for blob: URLs specifically — it was causing this to fail
   ("Failed to process that image") for photos that the Cropper component
   itself (which sets no such attribute) displayed just fine. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* Draws the cropped region onto a canvas and exports it as a JPEG data URI —
   this is what actually gets sent to and stored by the backend (see
   backend/src/functions/announcements.ts's MAX_IMAGE_DATA_URI_LENGTH).
   Downscales to maxDimension on the longest side and compresses via
   `quality` so a full-resolution phone photo doesn't blow past that cap. */
export async function getCroppedImageDataUrl(
  imageSrc: string,
  croppedAreaPixels: Area,
  maxDimension = 1600,
  quality = 0.85
): Promise<string> {
  const image = await loadImage(imageSrc);

  const scale = Math.min(1, maxDimension / Math.max(croppedAreaPixels.width, croppedAreaPixels.height));
  const outputWidth = Math.round(croppedAreaPixels.width * scale);
  const outputHeight = Math.round(croppedAreaPixels.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return canvas.toDataURL('image/jpeg', quality);
}
