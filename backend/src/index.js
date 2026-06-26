require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const feedRoutes = require('./routes/feed');
const knowledgeRoutes = require('./routes/knowledge');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
const prisma = new PrismaClient();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
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
