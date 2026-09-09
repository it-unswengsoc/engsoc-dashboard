import { OAuth2Client, TokenPayload } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

/* Login (openid/email/profile) plus read-write Calendar and per-file Drive
   access, all under the one consent screen. drive.file (not the full drive
   scope) only grants access to files the app itself creates/opens — swap it
   for https://www.googleapis.com/auth/drive if broader access turns out to
   be required. */
const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive.file',
];

function getOAuthClient(): OAuth2Client {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

/**
 * Builds the Google consent screen URL to redirect the user to.
 */
export function getGoogleAuthUrl(): string {
  const client = getOAuthClient();

  return client.generateAuthUrl({
    access_type: 'offline', // request a refresh_token, needed for Calendar/Drive access outside the login session
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture?: string;
}

/**
 * Exchanges the authorization code from the callback for tokens, and
 * verifies the ID token to recover the signed-in user's profile.
 */
export async function exchangeGoogleCode(code: string): Promise<{
  profile: GoogleProfile;
  accessToken?: string;
  refreshToken?: string;
}> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error('Google did not return an id_token');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload() as TokenPayload;

  if (!payload?.sub || !payload.email) {
    throw new Error('Google id_token payload missing sub/email');
  }

  return {
    profile: {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      firstName: payload.given_name ?? '',
      lastName: payload.family_name ?? '',
      picture: payload.picture,
    },
    accessToken: tokens.access_token ?? undefined,
    refreshToken: tokens.refresh_token ?? undefined,
  };
}
