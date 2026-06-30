require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const feedRoutes = require('./routes/feed');
const knowledgeRoutes = require('./routes/knowledge');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const generateRoutes = require('./routes/generate');

const app = express();
const prisma = require('./lib/prisma');

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Tambahkan IP lokal untuk development
    if (process.env.NODE_ENV !== 'production') {
      const localIPs = Array.from({ length: 14 }, (_, i) => `http://192.168.1.${i + 2}:3000`);
      allowedOrigins.push(...localIPs);
    }

    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.trycloudflare.com') ||
                      (process.env.NODE_ENV !== 'production' && origin.includes('localhost'));

    if (isAllowed) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') console.log('  Body:', { ...req.body, password: req.body?.password ? '[REDACTED]' : undefined });
  next();
});

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests from this IP' }
});
app.use('/api', globalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Knowledge Feed API'
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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize BullMQ Pipeline Worker (only in non-test environments)
let pipelineWorker = null;
if (process.env.NODE_ENV !== 'test') {
  try {
    const { createPipelineWorker } = require('./queue/workers/pipelineWorker');
    pipelineWorker = createPipelineWorker();
    console.log('Pipeline worker initialized');
  } catch (error) {
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

module.exports = { app, prisma };

