const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { generateKnowledgeCards } = require('../services/aiGenerator');

// GET /api/feed - Get feed with pagination
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, domains } = req.query;
    
    const domainFilter = domains ? domains.split(',') : null;
    
    let cards = await prisma.knowledgeCard.findMany({
      where: domainFilter ? { domain: { in: domainFilter } } : {},
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
    });

    // Generate new cards if we run out
    if (cards.length === 0) {
      cards = await generateKnowledgeCards(5, domainFilter);
    }

    res.json({
      success: true,
      data: cards,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: cards.length === parseInt(limit) || cards.length > 0,
      },
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// POST /api/feed/personalized - Get personalized feed
router.post('/personalized', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const { domains } = req.body;

    if (!domains || domains.length === 0) {
      return res.status(400).json({ error: 'Domains required' });
    }

    let cards = await prisma.knowledgeCard.findMany({
      where: { domain: { in: domains } },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
    });

    // Generate new cards if we run out
    if (cards.length === 0) {
      cards = await generateKnowledgeCards(5, domains);
    }

    res.json({
      success: true,
      data: cards,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: cards.length === parseInt(limit) || cards.length > 0,
      },
    });
  } catch (error) {
    console.error('Personalized feed error:', error);
    res.status(500).json({ error: 'Failed to fetch personalized feed' });
  }
});

module.exports = router;
