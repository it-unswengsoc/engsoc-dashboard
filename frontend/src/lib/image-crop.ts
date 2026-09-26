import type { Area } from 'react-easy-crop';

/* Every image this ever loads is either a blob: URL from a just-picked
   local file or a data: URI from an already-stored announcement image —
   never a genuine cross-origin http(s) URL. Setting crossOrigin on an <img>
   requests CORS validation from the browser, which blob:/data: sources
   don't actually need and which some browser versions handle
   inconsistently for blob: URLs specifically. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* Decoding a full-resolution phone photo (many modern cameras shoot
   40-100+ megapixels) straight into an <img> tag hits real, silent decode
   limits on some browsers/devices — especially Android Chrome, where it's
   the difference between working here and in react-easy-crop's own <img>
   (which only *displays* the photo, a cheaper operation than the full
   getImageData-capable decode a canvas draw needs). createImageBitmap
   decodes directly off the Blob without that intermediate <img>, handles
   much larger sources, and — critically — throws a real Error with an
   actual message on failure instead of a bare Event, so a genuine decode
   failure is now distinguishable from every other cause. Falls back to the
   <img> path for the rare browser without createImageBitmap support. */
async function loadDrawable(src: string): Promise<CanvasImageSource> {
  let bitmapFailure: unknown;
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = await (await fetch(src)).blob();
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch (err) {
      bitmapFailure = err;
    }
  }
  try {
    return await loadImage(src);
  } catch {
    throw bitmapFailure instanceof Error
      ? bitmapFailure
      : new Error('This photo could not be decoded by your browser — try a different file, or a smaller/re-saved copy of it.');
  }
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
  const image = await loadDrawable(imageSrc);

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

  if ('close' in image) image.close();

  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    // toDataURL is the one call in this pipeline that a browser extension or
    // privacy setting can legitimately block (canvas fingerprinting
    // protections throw here, e.g. some ad blockers / Brave-style guards) —
    // surface that distinctly so it isn't mistaken for a real decode bug.
    if (err instanceof DOMException && err.name === 'SecurityError') {
      throw new Error(
        'Your browser or an extension is blocking image export from this page (this is usually a privacy/ad-block feature) — try disabling extensions for this site, or use a different browser.'
      );
    }
    throw err;
  }
}
