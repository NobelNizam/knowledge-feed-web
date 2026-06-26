require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const feedRoutes = require('./routes/feed');
const knowledgeRoutes = require('./routes/knowledge');
const userRoutes = require('./routes/user');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Knowledge Feed API'
  });
});

// Routes
app.use('/api/feed', feedRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/user', userRoutes);

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Knowledge Feed API running on port ${PORT}`);
});

module.exports = { app, prisma };
