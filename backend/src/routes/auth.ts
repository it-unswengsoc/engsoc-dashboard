import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  verifyToken,
  findOrCreateGoogleUser,
  generateToken,
} from '../functions/auth';
import { getGoogleAuthUrl, exchangeGoogleCode, GoogleDomainError } from '../functions/google';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware to verify JWT token
export function verifyAuthToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }

  (req as any).user = decoded;
  next();
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate inputs
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: email, password, firstName, lastName',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long',
      });
    }

    const result = await registerUser(email, password, firstName, lastName);

    if (!result) {
      return res.status(400).json({
        status: 'error',
        message: 'Registration failed. User may already exist.',
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: email, password',
      });
    }

    const result = await loginUser(email, password);

    if (!result) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/profile
 * Get authenticated user profile
 */
router.get('/profile', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const profile = await getUserProfile(user.userId);

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { firstName, lastName } = req.body;

    // Validate inputs
    if (!firstName || !lastName) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: firstName, lastName',
      });
    }

    const success = await updateUserProfile(user.userId, firstName, lastName);

    if (!success) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to update profile',
      });
    }

    const updatedProfile = await getUserProfile(user.userId);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', verifyAuthToken, (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Logout successful. Please remove the token from client storage.',
  });
});

/**
 * GET /api/auth/google
 * Redirects to Google's OAuth consent screen. Plain "Sign in with Google"
 * needs no query param; the one-time admin flow that connects the shared
 * EngSoc Drive account passes ?intent=drive-connect (see .env.example).
 */
router.get('/google', (req: Request, res: Response) => {
  const intent = typeof req.query.intent === 'string' ? req.query.intent : undefined;
  res.redirect(getGoogleAuthUrl(intent));
});

/**
 * GET /api/auth/google/callback
 * Google's OAuth redirect target — this exact path is registered in Google
 * Cloud Console as the authorized redirect URI. Exchanges the auth code for
 * tokens, verifies the signed-in user's identity, and either:
 *   - signs them in (default) — finds/creates their `users` row and redirects
 *     back to the frontend with a JWT
 *   - or (state=drive-connect) returns the profile + refresh token as JSON,
 *     for the one-time admin setup that connects the shared EngSoc Drive.
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;

  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }

    const { profile, refreshToken } = await exchangeGoogleCode(code);

    if (state === 'drive-connect') {
      // refreshToken is only ever present on the first consent for an
      // account (Google omits it on repeat logins) — surfaced here so
      // whoever authorizes the club's shared Drive account can copy it once
      // into GOOGLE_DRIVE_REFRESH_TOKEN (see .env.example). It's sensitive:
      // treat it like a password, never commit it.
      return res.status(200).json({
        status: 'success',
        message: 'Google account verified',
        data: { ...profile, refreshToken },
      });
    }

    const user = await findOrCreateGoogleUser(
      profile.googleId,
      profile.email,
      profile.firstName,
      profile.lastName
    );

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }

    const token = generateToken(user.userId, user.email);
    res.redirect(`${FRONTEND_URL}/login?token=${encodeURIComponent(token)}`);
  } catch (error) {
    if (error instanceof GoogleDomainError) {
      return res.redirect(`${FRONTEND_URL}/login?error=domain_not_allowed`);
    }
    console.error('Google OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
  }
});

export default router;
