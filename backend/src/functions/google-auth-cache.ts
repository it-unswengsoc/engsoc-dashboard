import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/* Past this many members' clients, the least recently used is dropped. Far
   more than the club will have signed in to one warm instance at once. */
const MAX_CACHED_CLIENTS = 200;

/* One OAuth2 client per refresh token, kept for the life of the (warm)
   serverless instance. A fresh client only has the refresh token, so its
   first Google call has to swap that for an access token first, a whole
   extra round trip to Google. The Drive and Calendar code used to build a
   new client for every request, so every request paid it. A reused client
   keeps its access token until it's close to expiring (about an hour), then
   refreshes on its own, and shares one refresh between calls that start at
   the same time. Held in memory only, never stored. */
const clients = new Map<string, OAuth2Client>();

export function getGoogleAuthClient(refreshToken: string): OAuth2Client {
  const cached = clients.get(refreshToken);
  if (cached) {
    // Re-inserting moves it to the back, so eviction drops the stalest.
    clients.delete(refreshToken);
    clients.set(refreshToken, cached);
    return cached;
  }

  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
  auth.setCredentials({ refresh_token: refreshToken });
  clients.set(refreshToken, auth);
  if (clients.size > MAX_CACHED_CLIENTS) {
    const oldest = clients.keys().next().value;
    if (oldest !== undefined) clients.delete(oldest);
  }
  return auth;
}
