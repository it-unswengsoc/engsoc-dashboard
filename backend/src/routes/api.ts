import { Router, Request, Response } from 'express';

const router = Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Backend API is healthy',
  });
});

// Example endpoint
router.get('/example', (req: Request, res: Response) => {
  res.json({
    message: 'This is an example endpoint',
    data: {
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
