import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth';
import inspectionRoutes from './routes/inspections';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';

const app = express();

// On Vercel, only /tmp is writable
const isVercel = !!process.env.VERCEL;
const uploadsDir = isVercel
  ? '/tmp/uploads'
  : path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SafeVision AI',
    version: '1.0.0',
    env: isVercel ? 'vercel' : 'local',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
    return;
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
