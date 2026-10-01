/* Events are public (GET /events needs no sign-in), so their images are
   too — no signed URL like announcements'. `v` is updated_at, so any edit
   gives the image a new URL and the long browser cache never serves a
   stale one. */
export function eventImagePath(eventId: number, updatedAt: Date | string): string {
  return `/events/${eventId}/image?v=${new Date(updatedAt).getTime()}`;
}
