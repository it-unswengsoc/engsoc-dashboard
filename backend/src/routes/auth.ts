import { Router, type Request, type Response } from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  findOrCreateGoogleUser,
  generateToken,
} from '../functions/auth';
import { getGoogleAuthUrl, exchangeGoogleCode, GoogleDomainError } from '../functions/google';
import { verifyAuthToken, type AuthedRequest } from '../middleware/auth';
import { NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';
import { asyncHandler, created, ok } from '../lib/http';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /auth/register
 * Register a new user
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError('Missing required fields: email, password, firstName, lastName');
    }
    if (!EMAIL_PATTERN.test(email)) throw new ValidationError('Invalid email format');
    if (password.length < 8) throw new ValidationError('Password must be at least 8 characters long');

    const result = await registerUser(email, password, firstName, lastName);
    if (!result) throw new ValidationError('Registration failed. User may already exist.');

    created(res, result, { message: 'User registered successfully' });
  }),
);

/**
 * POST /auth/login
 * Login user and return JWT token
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new ValidationError('Missing required fields: email, password');

    const result = await loginUser(email, password);
    if (!result) throw new UnauthorizedError('Invalid email or password');

    ok(res, result, { message: 'Login successful' });
  }),
);

/**
 * GET /auth/profile
 * Get authenticated user profile
 */
router.get(
  '/profile',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const profile = await getUserProfile(req.user.userId);
    if (!profile) throw new NotFoundError('User profile not found');
    ok(res, profile);
  }),
);

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  verifyAuthToken,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) throw new ValidationError('Missing required fields: firstName, lastName');

    const success = await updateUserProfile(req.user.userId, firstName, lastName);
    if (!success) throw new ValidationError('Failed to update profile');

    ok(res, await getUserProfile(req.user.userId), { message: 'Profile updated successfully' });
  }),
);

/**
 * POST /auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', verifyAuthToken, (_req: Request, res: Response) => {
  ok(res, undefined, { message: 'Logout successful. Please remove the token from client storage.' });
});

/**
 * GET /auth/google
 * Redirects to Google's OAuth consent screen. Plain "Sign in with Google"
 * needs no query param; the one-time admin flow that connects the shared
 * EngSoc Drive account passes ?intent=drive-connect (see .env.example).
 */
router.get('/google', (req: Request, res: Response) => {
  const intent = typeof req.query.intent === 'string' ? req.query.intent : undefined;
  res.redirect(getGoogleAuthUrl(intent));
});

/**
 * GET /auth/google/callback
 * Google's OAuth redirect target — this exact path is registered in Google
 * Cloud Console as the authorized redirect URI. Exchanges the auth code for
 * tokens, verifies the signed-in user's identity, and either:
 *   - signs them in (default) — finds/creates their `users` row and redirects
 *     back to the frontend with a JWT
 *   - or (state=drive-connect) returns the profile + refresh token as JSON,
 *     for the one-time admin setup that connects the shared EngSoc Drive.
 *
 * Failures redirect back to the login page rather than answering JSON, so
 * this keeps its own try/catch instead of going through the error handler.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const failed = (reason = 'google_auth_failed') => res.redirect(`${FRONTEND_URL}/login?error=${reason}`);

  try {
    const { code, error } = req.query;
    if (error || !code || typeof code !== 'string') return failed();

    const { profile, refreshToken } = await exchangeGoogleCode(code);

    if (state === 'drive-connect') {
      // refreshToken is only ever present on the first consent for an
      // account (Google omits it on repeat logins) — surfaced here so
      // whoever authorizes the club's shared Drive account can copy it once
      // into GOOGLE_DRIVE_REFRESH_TOKEN (see .env.example). It's sensitive:
      // treat it like a password, never commit it.
      return ok(res, { ...profile, refreshToken }, { message: 'Google account verified' });
    }

    const user = await findOrCreateGoogleUser(
      profile.googleId,
      profile.email,
      profile.firstName,
      profile.lastName,
      refreshToken,
    );
    if (!user) return failed();

    const token = generateToken(user.userId, user.email);
    res.redirect(`${FRONTEND_URL}/login?token=${encodeURIComponent(token)}`);
  } catch (error) {
    if (error instanceof GoogleDomainError) return failed('domain_not_allowed');
    console.error('Google OAuth callback error:', error);
    failed();
  }
});

export default router;
