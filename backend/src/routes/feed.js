const express = require('express');
const router = express.Router();
const { Prisma } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/jwtSecrets');

const prisma = require('../lib/prisma');

const { createPipelineJob } = require('../pipeline/publisher');
const { addPipelineJob } = require('../queue/queueManager');
const { getDomainCache, setDomainCache, invalidateUserCache } = require('../services/cacheService');
const { executePipeline } = require('../queue/workers/pipelineWorker');
const { resolveFilterToTopics } = require('../services/domainHierarchy');

// Middleware helper untuk get userId jika ada auth, jika tidak null
const getUserId = (req) => req.user ? req.user.id : null;

// Helper untuk mengisi cache domain jika kosong/expired
async function populateCacheIfNeeded(domainTarget, domainFilter) {
  try {
    const cards = await prisma.knowledgeCard.findMany({
      where: domainFilter ? { domain: { in: domainFilter } } : undefined,
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    
    await setDomainCache(domainTarget, cards);
    return cards;
  } catch (err) {
    console.error(`[FeedRoute] Failed to populate cache for domain ${domainTarget}:`, err);
    return [];
  }
}

// GET /api/feed - Get feed with pagination
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, domains, seenIds } = req.query;
    let userId = null;
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {}
    }
    
    const domainFilter = domains ? domains.split(',') : null;
    const domainTarget = domainFilter && domainFilter.length > 0 
      ? (domainFilter.length === 1 ? domainFilter[0] : `multi:${[...domainFilter].sort().join(',')}`) 
      : '__all__';

    let excludeIds = [];
    if (seenIds) {
      excludeIds = seenIds.split(',').filter(id => id.trim() !== '');
    }
    
    let cachedCards = await getDomainCache(domainTarget);
    
    // Jika cache kosong, trigger pengisian cache
    if (!cachedCards || cachedCards.length === 0) {
      cachedCards = await populateCacheIfNeeded(domainTarget, domainFilter);
    }

    let cards = [];
    let usedCache = false;

    if (cachedCards && cachedCards.length > 0) {
      // Saring seenIds di memory level
      const excludeSet = new Set(excludeIds);
      const filtered = cachedCards.filter(card => !excludeSet.has(card.id));
      
      // Jika data tersisa cukup setelah disaring, ambil dari cache
      if (filtered.length >= parseInt(limit)) {
        cards = filtered.slice(0, parseInt(limit));
        usedCache = true;
      } else if (filtered.length > 0 && filtered.length < parseInt(limit)) {
        // Ambil sisa yang ada, tapi campur dengan query DB jika hasMore
        cards = filtered;
      }
    }

    // Jika cache miss atau data tidak mencukupi, query ke database terurut waktu (ORDER BY createdAt desc)
    if (!usedCache) {
      const dbCards = await prisma.knowledgeCard.findMany({
        where: {
          domain: domainFilter ? { in: domainFilter } : undefined,
          id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined
        },
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      });

      // Gabungkan data dari cache filter dengan database (jika ada irisan parsial)
      const existingIds = new Set(cards.map(c => c.id));
      const uniqueDbCards = dbCards.filter(c => !existingIds.has(c.id));
      cards = [...cards, ...uniqueDbCards].slice(0, parseInt(limit));
    }

    const cardIds = cards.map(c => c.id);
    const [likes, userLikes, comments, savedCards, bookmarkCounts] = await Promise.all([
      prisma.like.groupBy({
        by: ['cardId'],
        where: { cardId: { in: cardIds } },
        _count: { id: true }
      }),
      userId ? prisma.like.findMany({
        where: { userId, cardId: { in: cardIds } }
      }) : [],
      prisma.comment.groupBy({
        by: ['cardId'],
        where: { cardId: { in: cardIds } },
        _count: { id: true }
      }),
      userId ? prisma.user.findUnique({
        where: { id: userId },
        select: { savedCards: { select: { id: true } } }
      }) : null,
      prisma.knowledgeCard.findMany({
        where: { id: { in: cardIds } },
        select: {
          id: true,
          _count: {
            select: { savedBy: true }
          }
        }
      })
    ]);

    const likesMap = Object.fromEntries(likes.map(l => [l.cardId, l._count.id]));
    const likedSet = new Set(userLikes.map(ul => ul.cardId));
    const commentsMap = Object.fromEntries(comments.map(c => [c.cardId, c._count.id]));
    const savedSet = new Set(savedCards?.savedCards?.map(sc => sc.id) || []);
    const saveCountsMap = Object.fromEntries(bookmarkCounts.map(bc => [bc.id, bc._count.savedBy]));

    const responseData = {
      success: true,
      data: cards.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type,
        domain: row.domain,
        tags: row.tags,
        sourceUrl: row.sourceUrl || row.source_url,
        sourceName: row.sourceName || row.source_name,
        aiModel: row.aiModel || row.ai_model,
        generatedAt: row.generatedAt || row.generated_at,
        viewCount: row.viewCount || row.view_count,
        saveCount: saveCountsMap[row.id] || 0,
        shareCount: row.shareCount || row.share_count || 0,
        engagementScore: row.engagementScore || row.engagement_score,
        factChecked: row.factChecked || row.fact_checked,
        factCheckScore: row.factCheckScore || row.fact_check_score,
        moderationStatus: row.moderationStatus || row.moderation_status,
        sourceChunkIds: row.sourceChunkIds || row.source_chunk_ids,
        citations: row.citations,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        likeCount: likesMap[row.id] || 0,
        liked: likedSet.has(row.id),
        saved: savedSet.has(row.id),
        commentsCount: commentsMap[row.id] || 0
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: cards.length === parseInt(limit) || cards.length > 0,
      },
    };

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
    let userId = null;
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {}
    }

    if (!domains || domains.length === 0) {
      return res.status(400).json({ error: 'Domains required' });
    }

    const domainTarget = domains && domains.length > 0 
      ? (domains.length === 1 ? domains[0] : `multi:${[...domains].sort().join(',')}`) 
      : '__all__';
    let excludeIds = seenIds || [];

    let cachedCards = await getDomainCache(domainTarget);
    if (!cachedCards || cachedCards.length === 0) {
      cachedCards = await populateCacheIfNeeded(domainTarget, domains);
    }

    let cards = [];
    let usedCache = false;

    if (cachedCards && cachedCards.length > 0) {
      const excludeSet = new Set(excludeIds);
      const filtered = cachedCards.filter(card => !excludeSet.has(card.id));
      
      if (filtered.length >= parseInt(limit)) {
        cards = filtered.slice(0, parseInt(limit));
        usedCache = true;
      } else if (filtered.length > 0) {
        cards = filtered;
      }
    }

    if (!usedCache) {
      const dbCards = await prisma.knowledgeCard.findMany({
        where: {
          domain: { in: domains },
          id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined
        },
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      });

      const existingIds = new Set(cards.map(c => c.id));
      const uniqueDbCards = dbCards.filter(c => !existingIds.has(c.id));
      cards = [...cards, ...uniqueDbCards].slice(0, parseInt(limit));
    }

    const cardIds = cards.map(c => c.id);
    const [likes, userLikes, comments, savedCards] = await Promise.all([
      prisma.like.groupBy({
        by: ['cardId'],
        where: { cardId: { in: cardIds } },
        _count: { id: true }
      }),
      userId ? prisma.like.findMany({
        where: { userId, cardId: { in: cardIds } }
      }) : [],
      prisma.comment.groupBy({
        by: ['cardId'],
        where: { cardId: { in: cardIds } },
        _count: { id: true }
      }),
      userId ? prisma.user.findUnique({
        where: { id: userId },
        select: { savedCards: { select: { id: true } } }
      }) : null
    ]);

    const likesMap = Object.fromEntries(likes.map(l => [l.cardId, l._count.id]));
    const likedSet = new Set(userLikes.map(ul => ul.cardId));
    const commentsMap = Object.fromEntries(comments.map(c => [c.cardId, c._count.id]));
    const savedSet = new Set(savedCards?.savedCards?.map(sc => sc.id) || []);

    const responseData = {
      success: true,
      data: cards.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        type: row.type,
        domain: row.domain,
        tags: row.tags,
        sourceUrl: row.sourceUrl || row.source_url,
        sourceName: row.sourceName || row.source_name,
        aiModel: row.aiModel || row.ai_model,
        generatedAt: row.generatedAt || row.generated_at,
        viewCount: row.viewCount || row.view_count,
        saveCount: row.saveCount || row.save_count,
        shareCount: row.shareCount || row.share_count || 0,
        engagementScore: row.engagementScore || row.engagement_score,
        factChecked: row.factChecked || row.fact_checked,
        factCheckScore: row.factCheckScore || row.fact_check_score,
        moderationStatus: row.moderationStatus || row.moderation_status,
        sourceChunkIds: row.sourceChunkIds || row.source_chunk_ids,
        citations: row.citations,
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
        likeCount: likesMap[row.id] || 0,
        liked: likedSet.has(row.id),
        saved: savedSet.has(row.id),
        commentsCount: commentsMap[row.id] || 0
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: cards.length === parseInt(limit) || cards.length > 0,
      },
    };

    res.json(responseData);
  } catch (error) {
    console.error('Personalized feed error:', error);
    res.status(500).json({ error: 'Failed to fetch personalized feed' });
  }
});

// POST /api/feed/refresh - Sync generate 5 items for pull-to-refresh (filter-aware)
router.post('/refresh', async (req, res) => {
  try {
    const { filterType = 'all', filterValue = 'Semua' } = req.body || {};
    
    let targetFilterType = filterType;
    let targetFilterValue = filterValue;

    if (filterType === 'all') {
      let userId = null;
      const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.userId;
        } catch (e) {}
      }

      if (userId) {
        const prefs = await prisma.userPreferences.findUnique({
          where: { userId }
        });
        if (prefs && prefs.domains && prefs.domains.length > 0) {
          targetFilterType = 'preferences';
          targetFilterValue = prefs.domains;
          console.log(`[FeedRefresh] Loading preferences for user ${userId}: [${prefs.domains.join(', ')}]`);
        }
      }
    }

    // Resolve filter ke topik konkret menggunakan hierarki 3 level
    const { disciplines, subtopicMap } = resolveFilterToTopics(targetFilterType, targetFilterValue);
    
    console.log(`[FeedRefresh] Filter: ${filterType}/${filterValue} → Disciplines: [${disciplines.join(', ')}]`);
    if (subtopicMap && Object.keys(subtopicMap).length > 0) {
      for (const [disc, subs] of Object.entries(subtopicMap)) {
        console.log(`[FeedRefresh]   ${disc} → subtopics: [${subs.join(', ')}]`);
      }
    }

    const pipelineJob = await createPipelineJob({
      type: 'full_pipeline',
      input: { topics: disciplines, count: 5, subtopicMap },
    });

    await prisma.pipelineJob.update({
      where: { id: pipelineJob.id },
      data: { status: 'processing', startedAt: new Date() },
    });

    const result = await executePipeline({
      topics: disciplines,
      count: 5,
      pipelineJobId: pipelineJob.id,
      subtopicMap,
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


