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
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import notificationRoutes from './routes/notifications';
import driveRoutes from './routes/drive';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api', apiRoutes);

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
