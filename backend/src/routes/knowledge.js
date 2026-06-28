const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/knowledge/search - Search cards
router.get('/search', async (req, res) => {
  try {
    const { q, domain, limit = 20 } = req.query;

    const cards = await prisma.knowledgeCard.findMany({
      where: {
        AND: [
          q ? { title: { contains: q, mode: 'insensitive' } } : {},
          domain ? { domain } : {},
        ],
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search cards' });
  }
});

// GET /api/knowledge/trending - Get trending cards
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const cards = await prisma.knowledgeCard.findMany({
      where: { createdAt: { gte: weekAgo } },
      orderBy: { engagementScore: 'desc' },
      take: parseInt(limit),
    });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending cards' });
  }
});

// GET /api/knowledge/domains - Get all domains
router.get('/domains', async (req, res) => {
  try {
    const domains = await prisma.knowledgeCard.groupBy({
      by: ['domain'],
      _count: { id: true },
    });

    const domainNames = domains.map(d => d.domain);
    res.json({ success: true, data: domainNames });
  } catch (error) {
    console.error('Domains error:', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// GET /api/knowledge/:id - Get single card
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const card = await prisma.knowledgeCard.findUnique({
      where: { id },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ success: true, data: card });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

module.exports = router;
