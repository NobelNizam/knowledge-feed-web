import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth';
import feedRoutes from './routes/feed';
import knowledgeRoutes from './routes/knowledge';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import generateRoutes from './routes/generate';
import csrfMiddleware from './middleware/csrf';

import prisma from './lib/prisma';

const app: Application = express();

// Trust the first proxy (Cloudflare tunnel, nginx, etc.) so that
// req.ip, req.protocol, and req.secure reflect the real client/edge.
// Required for secure cookies behind a TLS-terminating proxy.
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL,
      ].filter(Boolean) as string[];

      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        const localIPs = Array.from({ length: 14 }, (_, i) => `http://192.168.1.${i + 2}:3000`);
        allowedOrigins.push(...localIPs);
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        (isDev && origin.includes('localhost')) ||
        (isDev && origin.endsWith('.trycloudflare.com'));

      if (isAllowed) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
// ponytail: redact PII / secret fields at the trust boundary so logs never
// carry passwords, tokens, or email/name without a deliberate choice.
const REDACTED_FIELDS = new Set([
  'password', 'oldPassword', 'newPassword',
  'token', 'refreshToken', 'accessToken',
  'authorization', 'cookie', 'set-cookie',
  'email', 'name', 'text', 'comment', 'content',
]);
const REDACTED = '[REDACTED]';
const sanitize = (value: any): any => {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACTED_FIELDS.has(k) ? REDACTED : sanitize(v);
    }
    return out;
  }
  return value;
};
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST' && req.body) console.log('  Body:', sanitize(req.body));
  next();
});

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests from this IP' },
});
app.use('/api', globalLimiter);

// CSRF: Origin/Referer guard for cookie-auth mutating endpoints
app.use('/api', csrfMiddleware);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Knowledge Feed API',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/generate', generateRoutes);

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize BullMQ Pipeline Worker (only in non-test environments)
let pipelineWorker: any = null;
if (process.env.NODE_ENV !== 'test') {
  try {
    const { createPipelineWorker } = require('./queue/workers/pipelineWorker');
    pipelineWorker = createPipelineWorker();
    console.log('Pipeline worker initialized');
  } catch (error: any) {
    console.warn('Pipeline worker not started (Redis may not be available):', error.message);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (pipelineWorker) {
    await pipelineWorker.close();
  }
  const { closeAllQueues } = require('./queue/queueManager');
  await closeAllQueues();
  await prisma.$disconnect();
  process.exit(0);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Knowledge Feed API running on port ${PORT}`);
  });
}

export { app, prisma };
