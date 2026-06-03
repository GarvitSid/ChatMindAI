import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import documentRoutes from './routes/document.routes.js';
import healthRoutes from './routes/health.routes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...clientUrls,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])
);

// 1. Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS Restriction
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Render health checks)
      if (!origin) return callback(null, true);

      // Check explicitly configured origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow any Vercel preview or production deployment for this app
      if (/^https:\/\/.*\.vercel\.app$/i.test(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Body Parsing & Logging
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to ChatMind AI College RAG API',
    health: '/api/health',
  });
});

// 5. Centralized Error Handler
app.use(errorHandler);

export default app;
