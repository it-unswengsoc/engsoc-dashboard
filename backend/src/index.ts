// dotenv is dev-only. Vercel injects real env vars straight into
// process.env in production — there's no .env file in the deployed bundle,
// so dotenv.config() would be a no-op there even if it worked. It didn't:
// Vercel's function bundler for this service has failed to trace this
// package's require() under two different import styles now
// (`dotenv/config`, then a plain `import dotenv from 'dotenv'`), dropping
// it from the deployed bundle and crashing every route on
// "Cannot find module". Rather than chase a third import style, this stops
// production depending on the package being present in the bundle at all —
// skipped outright on Vercel (VERCEL is always set there), and loaded via a
// dynamic require (invisible to static bundler analysis) everywhere else,
// so local `.env` loading keeps working against the real node_modules.
if (!process.env.VERCEL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config();
  } catch {
    // not installed locally — fine, env vars can be set another way
  }
}

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import notificationRoutes from './routes/notifications';
import driveRoutes from './routes/drive';
import announcementRoutes from './routes/announcements';
import calendarRoutes from './routes/calendar';
import adminRoutes from './routes/admin';
import userRoutes from './routes/users';
import taskRoutes from './routes/tasks';

const app: Application = express();
// Frontend owns port 3000 by Next.js convention; this backend now runs as
// its own standalone service (not routed through the frontend's domain
// anymore), so it needs a port of its own for local dev.
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
// Default body-parser limit is 100kb — comfortably enough for everything
// except announcement images (functions/announcements.ts's
// MAX_IMAGE_DATA_URI_LENGTH allows up to ~3MB of base64 there), which were
// silently 413-ing here before that validation ever ran. Raised well past
// that cap so the more precise, JSON-error-returning check in
// createAnnouncement/updateAnnouncement is what actually enforces the limit.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes — no /api prefix: this backend has its own domain now
// (previously /api/backend/* routed here through the frontend's domain via
// Vercel's "Services" feature, which never correctly packaged this
// service's dependencies; it's a standalone deployment now, so a plain
// resource-named path is all that's needed).
app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/notifications', notificationRoutes);
app.use('/drive', driveRoutes);
app.use('/announcements', announcementRoutes);
app.use('/calendar', calendarRoutes);
app.use('/admin', adminRoutes);
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'EngSoc Dashboard API',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
