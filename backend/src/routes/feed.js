const express = require('express');
const router = express.Router();
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

const { createPipelineJob } = require('../pipeline/publisher');
const { addPipelineJob } = require('../queue/queueManager');
const { getCachedFeed, cacheFeed, invalidateUserCache } = require('../services/cacheService');
const { executePipeline } = require('../queue/workers/pipelineWorker');

// Middleware helper untuk get userId jika ada auth, jika tidak null
const getUserId = (req) => req.user ? req.user.id : null;

// GET /api/feed - Get feed with pagination
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, domains, seenIds } = req.query;
    const userId = getUserId(req);
    
    // Cek cache terlebih dahulu
    const cachedData = await getCachedFeed(userId, req.query);
    if (cachedData) {
      return res.json(cachedData);
    }

    const domainFilter = domains ? domains.split(',') : null;
    let excludeIds = [];
    if (seenIds) {
      excludeIds = seenIds.split(',');
    }
    
    let cards = [];

    if (!domainFilter) {
      // Filter "Semua": Ambil secara acak (ORDER BY RANDOM())
      let rawCards = [];
      if (excludeIds.length > 0) {
        rawCards = await prisma.$queryRaw`
          SELECT * FROM "knowledge_cards"
          WHERE id NOT IN (${Prisma.join(excludeIds)})
          ORDER BY RANDOM()
          LIMIT ${parseInt(limit)}
        `;
      } else {
        rawCards = await prisma.$queryRaw`
          SELECT * FROM "knowledge_cards"
          ORDER BY RANDOM()
          LIMIT ${parseInt(limit)}
        `;
      }

      cards = rawCards.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type,
        domain: row.domain,
        tags: row.tags,
        sourceUrl: row.source_url,
        sourceName: row.source_name,
        aiModel: row.ai_model,
        generatedAt: row.generated_at,
        viewCount: row.view_count,
        saveCount: row.save_count,
        engagementScore: row.engagement_score,
        factChecked: row.fact_checked,
        factCheckScore: row.fact_check_score,
        moderationStatus: row.moderation_status,
        sourceChunkIds: row.source_chunk_ids,
        citations: row.citations,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } else {
      // Jika ada filter domain, ambil terurut waktu
      // Hindari double offset bug: jika excludeIds aktif, skip diatur ke 0
      cards = await prisma.knowledgeCard.findMany({
        where: {
          domain: { in: domainFilter },
          id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined
        },
        take: parseInt(limit),
        skip: excludeIds.length > 0 ? 0 : parseInt(offset),
        orderBy: { createdAt: 'desc' },
      });
    }

    const responseData = {
      success: true,
      data: cards,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: cards.length === parseInt(limit) || cards.length > 0,
      },
    };

    // Simpan ke cache
    await cacheFeed(userId, req.query, responseData);

    res.json(responseData);
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// POST /api/feed/personalized - Get personalized feed
router.post('/personalized', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const { domains, seenIds } = req.body;
    const userId = getUserId(req);

    if (!domains || domains.length === 0) {
      return res.status(400).json({ error: 'Domains required' });
    }

    // Cek cache
    const queryParams = { ...req.query, domains };
    const cachedData = await getCachedFeed(userId, queryParams);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Hindari double offset bug: jika seenIds aktif, skip diatur ke 0
    let cards = await prisma.knowledgeCard.findMany({
      where: {
        domain: { in: domains },
        id: seenIds && seenIds.length > 0 ? { notIn: seenIds } : undefined
      },
      take: parseInt(limit),
      skip: seenIds && seenIds.length > 0 ? 0 : parseInt(offset),
      orderBy: { createdAt: 'desc' },
    });

    const responseData = {
      success: true,
      data: cards,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: cards.length === parseInt(limit) || cards.length > 0,
      },
    };

    // Simpan ke cache
    await cacheFeed(userId, queryParams, responseData);

    res.json(responseData);
  } catch (error) {
    console.error('Personalized feed error:', error);
    res.status(500).json({ error: 'Failed to fetch personalized feed' });
  }
});

// POST /api/feed/refresh - Sync generate 5 items for pull-to-refresh
router.post('/refresh', async (req, res) => {
  try {
    const ALL_DOMAINS = ['sains', 'teknologi', 'sejarah', 'filosofi', 'seni', 'psikologi', 'kesehatan', 'luar angkasa', 'coding', 'matematika', 'ekonomi', 'hukum', 'lingkungan', 'sosiologi', 'geografi', 'astronomi', 'biologi', 'fisika', 'kimia', 'bahasa', 'musik', 'olahraga', 'kuliner', 'pertanian'];
    
    // Pick 5 random topics for generation to keep it diverse
    const shuffledTopics = ALL_DOMAINS.sort(() => 0.5 - Math.random());
    const selectedTopics = shuffledTopics.slice(0, 5);

    const pipelineJob = await createPipelineJob({
      type: 'full_pipeline',
      input: { topics: selectedTopics, count: 5 },
    });

    await prisma.pipelineJob.update({
      where: { id: pipelineJob.id },
      data: { status: 'processing', startedAt: new Date() },
    });

    const result = await executePipeline({
      topics: selectedTopics,
      count: 5,
      pipelineJobId: pipelineJob.id,
    });

    // Invalidate cache for the user since new content has been generated
    const userId = getUserId(req);
    await invalidateUserCache(userId);

    res.json({
      success: true,
      data: result.publishedCards || []
    });
  } catch (error) {
    console.error('Feed refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh feed' });
  }
});

module.exports = router;
