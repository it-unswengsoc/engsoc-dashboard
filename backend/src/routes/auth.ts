import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  verifyToken,
} from '../functions/auth';

const router = Router();

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

export default router;
