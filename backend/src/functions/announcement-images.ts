import crypto from 'crypto';
import { JWT_SECRET } from './auth';

/* Announcement images are stored as data: URIs in announcements.image_url
   (see MAX_IMAGE_DATA_URI_LENGTH in ./announcements). Sending them inline in
   every list response made GET /announcements, and the dashboard behind it,
   as heavy as every image put together, so list responses now carry a URL
   to GET /announcements/:id/image instead and the browser fetches each
   image on its own, lazily, and caches it.

   An <img> can't send our Authorization header, so that route can't sit
   behind verifyAuthToken. Instead the URL is signed: only a response that
   already passed auth hands one out, and the signature can't be forged or
   moved to another announcement's id. `v` is the announcement's updated_at,
   so editing the image gives it a new URL and the long browser cache never
   serves a stale one. */

/* Derived from JWT_SECRET rather than a new env var, so it's exactly as
   strong as sign-in itself, without reusing the raw JWT key for another
   purpose. */
const IMAGE_URL_KEY = crypto.createHmac('sha256', JWT_SECRET).update('announcement-image-urls').digest();

function sign(announcementId: number, version: string): string {
  return crypto.createHmac('sha256', IMAGE_URL_KEY).update(`${announcementId}.${version}`).digest('base64url');
}

/* Relative to the backend's own origin; the frontend prefixes its API URL. */
export function announcementImagePath(announcementId: number, updatedAt: Date | string): string {
  const version = String(new Date(updatedAt).getTime());
  return `/announcements/${announcementId}/image?v=${version}&sig=${sign(announcementId, version)}`;
}

export function isValidAnnouncementImageSignature(announcementId: number, version: string, signature: string): boolean {
  const expected = Buffer.from(sign(announcementId, version));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/* Raster types only: an SVG opened directly would be a document on the
   backend's origin, able to run script. What the composer produces is a
   JPEG (see frontend lib/image-crop.ts), so nothing real is excluded. */
const IMAGE_DATA_URI = /^data:(image\/(?:png|jpeg|gif|webp|avif));base64,(.+)$/s;

export function decodeImageDataUri(dataUri: string): { contentType: string; body: Buffer } | null {
  const match = IMAGE_DATA_URI.exec(dataUri);
  if (!match) return null;
  return { contentType: match[1], body: Buffer.from(match[2], 'base64') };
}
