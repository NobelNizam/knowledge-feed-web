import express, { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/jwtSecrets';
import authMiddleware from '../middleware/auth';

import prisma from '../lib/prisma';
import { createPipelineJob } from '../pipeline/publisher';
import { addPipelineJob, getRedisConnection } from '../queue/queueManager';
import { getDomainCache, setDomainCache, invalidateUserCache } from '../services/cacheService';
import { executePipeline } from '../queue/workers/pipelineWorker';
import { resolveFilterToTopics, getLevel2ForLevel1 } from '../services/domainHierarchy';

const router: Router = express.Router();

// ponytail: trust-boundary clamp; [1,100], default 20. Do not raise the cap
// until a paginated cursor replaces offset reads.
const clampLimit = (raw: any, max = 100, fallback = 20): number => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};

const getUserId = (req: Request): string | null => (req.user ? req.user.userId : null);

/**
 * Memperkaya (enrich) daftar kartu pengetahuan dengan data interaksi pengguna
 * ponytail: DRY helper untuk interaksi kartu
 */
async function enrichCardInteractions(cards: any[], userId: string | null) {
  if (!cards || cards.length === 0) return [];

  const cardIds = cards.map((c) => c.id);

  const [likes, userLikes, comments, savedCards] = await Promise.all([
    prisma.like.groupBy({
      by: ['cardId'],
      where: { cardId: { in: cardIds } },
      _count: { id: true },
    }),
    userId
      ? prisma.like.findMany({ where: { userId, cardId: { in: cardIds } } })
      : Promise.resolve([]),
    prisma.comment.groupBy({
      by: ['cardId'],
      where: { cardId: { in: cardIds } },
      _count: { id: true },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { savedCards: { select: { id: true } } },
        })
      : Promise.resolve(null),
  ]);

  const likesMap = Object.fromEntries(likes.map((l) => [l.cardId, l._count.id]));
  const likedSet = new Set(userLikes.map((ul) => ul.cardId));
  const commentsMap = Object.fromEntries(comments.map((c) => [c.cardId, c._count.id]));
  const savedSet = new Set(savedCards?.savedCards?.map((sc: any) => sc.id) || []);

  return cards.map((row) => ({
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
    saveCount: row.saveCount || row.save_count || 0,
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
    commentsCount: commentsMap[row.id] || 0,
  }));
}

async function populateCacheIfNeeded(domainTarget: string, domainFilter: string[] | null) {
  try {
    const cards = await prisma.knowledgeCard.findMany({
      where: domainFilter ? { domain: { in: domainFilter } } : undefined,
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
    await setDomainCache(domainTarget, cards);
    return cards;
  } catch (err) {
    console.error(`[FeedRoute] Failed to populate cache for domain ${domainTarget}:`, err);
    return [];
  }
}

// GET /api/feed
router.get('/', async (req: Request, res: Response) => {
  try {
    const { offset = 0, domains, seenIds } = req.query;
    const limit = clampLimit(req.query.limit);
    let userId: string | null = null;
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch {
        // ignore
      }
    }

    const domainFilter = domains ? String(domains).split(',') : null;
    const domainTarget =
      domainFilter && domainFilter.length > 0
        ? domainFilter.length === 1
          ? domainFilter[0]
          : `multi:${[...domainFilter].sort().join(',')}`
        : '__all__';

    let excludeIds: string[] = [];
    if (seenIds) {
      excludeIds = String(seenIds).split(',').filter((id) => id.trim() !== '');
    }

    let cachedCards = await getDomainCache(domainTarget);

    if (!cachedCards || cachedCards.length === 0) {
      cachedCards = await populateCacheIfNeeded(domainTarget, domainFilter);
    }

    let cards: any[] = [];
    let usedCache = false;

    if (cachedCards && cachedCards.length > 0) {
      const excludeSet = new Set(excludeIds);
      const filtered = cachedCards.filter((card: any) => !excludeSet.has(card.id));
      if (filtered.length >= limit) {
        cards = filtered.slice(0, limit);
        usedCache = true;
      } else if (filtered.length > 0 && filtered.length < limit) {
        cards = filtered;
      }
    }

    if (!usedCache) {
      const dbCards = await prisma.knowledgeCard.findMany({
        where: {
          domain: domainFilter ? { in: domainFilter } : undefined,
          id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const existingIds = new Set(cards.map((c) => c.id));
      const uniqueDbCards = dbCards.filter((c) => !existingIds.has(c.id));
      cards = [...cards, ...uniqueDbCards].slice(0, limit);
    }

    const enrichedCards = await enrichCardInteractions(cards, userId);

    res.json({
      success: true,
      data: enrichedCards,
      pagination: {
        limit,
        offset: parseInt(String(offset)),
        hasMore: cards.length === limit || cards.length > 0,
      },
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// POST /api/feed/personalized
router.post('/personalized', async (req: Request, res: Response) => {
  try {
    const { offset = 0 } = req.query;
    const limit = clampLimit(req.query.limit);
    const { domains, seenIds } = req.body || {};
    let userId: string | null = null;
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch {
        // ignore
      }
    }

    if (!domains || domains.length === 0) {
      return res.status(400).json({ error: 'Domains required' });
    }

    const domainTarget =
      domains && domains.length > 0
        ? domains.length === 1
          ? domains[0]
          : `multi:${[...domains].sort().join(',')}`
        : '__all__';
    const excludeIds: string[] = seenIds || [];

    let cachedCards = await getDomainCache(domainTarget);
    if (!cachedCards || cachedCards.length === 0) {
      cachedCards = await populateCacheIfNeeded(domainTarget, domains);
    }

    let cards: any[] = [];
    let usedCache = false;

    if (cachedCards && cachedCards.length > 0) {
      const excludeSet = new Set(excludeIds);
      const filtered = cachedCards.filter((card: any) => !excludeSet.has(card.id));
      if (filtered.length >= limit) {
        cards = filtered.slice(0, limit);
        usedCache = true;
      } else if (filtered.length > 0) {
        cards = filtered;
      }
    }

    if (!usedCache) {
      const dbCards = await prisma.knowledgeCard.findMany({
        where: {
          domain: { in: domains },
          id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const existingIds = new Set(cards.map((c) => c.id));
      const uniqueDbCards = dbCards.filter((c) => !existingIds.has(c.id));
      cards = [...cards, ...uniqueDbCards].slice(0, limit);
    }

    const enrichedCards = await enrichCardInteractions(cards, userId);

    res.json({
      success: true,
      data: enrichedCards,
      pagination: {
        limit,
        offset: parseInt(String(offset)),
        hasMore: cards.length === limit || cards.length > 0,
      },
    });
  } catch (error) {
    console.error('Personalized feed error:', error);
    res.status(500).json({ error: 'Failed to fetch personalized feed' });
  }
});

// POST /api/feed/refresh
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { filterType = 'all', filterValue = 'Semua' } = req.body || {};

    let targetFilterType = filterType;
    let targetFilterValue: string | string[] = filterValue;

    if (filterType === 'all') {
      const userId = req.user!.userId;
      const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
      if (prefs && prefs.domains && prefs.domains.length > 0) {
        targetFilterType = 'preferences';
        targetFilterValue = prefs.domains;
        console.log(`[FeedRefresh] Loading preferences for user ${userId}: [${prefs.domains.join(', ')}]`);
      }
    }

    const { disciplines, subtopicMap } = resolveFilterToTopics(targetFilterType, targetFilterValue);
    console.log(`[FeedRefresh] Filter: ${filterType}/${filterValue} → Disciplines: [${disciplines.join(', ')}]`);

    const pipelineJob = await createPipelineJob({
      type: 'full_pipeline',
      input: { topics: disciplines, count: 5, subtopicMap },
    });

    let bullmqJob;
    try {
      bullmqJob = await addPipelineJob({
        topics: disciplines,
        count: 5,
        pipelineJobId: pipelineJob.id,
      });
    } catch (queueErr: any) {
      console.error('[FeedRefresh] Queue unavailable, rejecting refresh:', queueErr.message);
      await prisma.pipelineJob.update({
        where: { id: pipelineJob.id },
        data: { status: 'failed', error: `Queue unavailable: ${queueErr.message}` },
      });
      return res.status(503).json({ error: 'Feed refresh queue is currently unavailable. Please retry shortly.' });
    }

    await prisma.pipelineJob.update({
      where: { id: pipelineJob.id },
      data: { bullmqJobId: bullmqJob.id, status: 'queued' },
    });

    res.status(202).json({
      success: true,
      jobId: pipelineJob.id,
      bullmqJobId: bullmqJob.id,
      status: 'queued',
      sseUrl: `/api/feed/refresh/sse?filterType=${encodeURIComponent(filterType)}&filterValue=${encodeURIComponent(typeof filterValue === 'string' ? filterValue : 'Semua')}`,
    });
  } catch (error) {
    console.error('Feed refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh feed' });
  }
});

// GET /api/feed/refresh/sse
router.get('/refresh/sse', authMiddleware, async (req: Request, res: Response) => {
  const { filterType = 'all', filterValue = 'Semua', seenIds } = req.query as Record<string, string>;
  const userId = req.user!.userId;

  let targetFilterType = filterType;
  let targetFilterValue: string | string[] = filterValue;
  if (filterType === 'all') {
    const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    if (prefs && prefs.domains && prefs.domains.length > 0) {
      targetFilterType = 'preferences';
      targetFilterValue = prefs.domains;
    }
  }

  let domainFilter: string[] | undefined = undefined;
  if (targetFilterType === 'level2') {
    domainFilter = [targetFilterValue as string];
  } else if (targetFilterType === 'level1') {
    domainFilter = getLevel2ForLevel1(targetFilterValue as string);
  } else if (targetFilterType === 'preferences') {
    domainFilter = Array.isArray(targetFilterValue) ? targetFilterValue : [];
  }

  let viewedCardIds: string[] = [];
  try {
    const views = await prisma.view.findMany({ where: { userId }, select: { cardId: true } });
    viewedCardIds = views.map((v) => v.cardId);
  } catch (err: any) {
    console.error('[FeedRefreshSSE] Error loading user views:', err.message);
  }

  const querySeenIds = seenIds ? String(seenIds).split(',').filter((id) => id.trim() !== '') : [];
  const allSeenIds = Array.from(new Set([...viewedCardIds, ...querySeenIds]));

  let availableCards: any[] = [];
  try {
    availableCards = await prisma.knowledgeCard.findMany({
      where: {
        domain: domainFilter ? { in: domainFilter } : undefined,
        id: allSeenIds.length > 0 ? { notIn: allSeenIds } : undefined,
        moderationStatus: 'approved',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  } catch (err: any) {
    console.error('[FeedRefreshSSE] DB check failed:', err.message);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  if (availableCards.length > 0) {
    const enrichedCards = await enrichCardInteractions(availableCards, userId);
    res.write(`event: complete\ndata: ${JSON.stringify({ cards: enrichedCards, source: 'database' })}\n\n`);
    res.end();
    return;
  }

  const redis = getRedisConnection();
  if (!redis) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Refresh unavailable: cache layer offline. Please retry shortly.' })}\n\n`);
    res.end();
    return;
  }

  const lockKey = `lock:refresh:user:${userId}`;
  let lockAcquired = false;
  try {
    // ponytail: ioredis overloads set() with strict KEEPTTL-vs-NX type guards.
    // Runtime accepts NX fine; cast through unknown to bypass the literal union.
    const setRes = await (redis.set as any)(lockKey, 'locked', 'NX', 'EX', 60);
    lockAcquired = setRes === 'OK';
  } catch (lockErr: any) {
    console.error('[FeedRefreshSSE] Redis lock acquire failed:', lockErr.message);
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Refresh unavailable: lock layer error. Please retry shortly.' })}\n\n`);
    res.end();
    return;
  }

  if (!lockAcquired) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Proses penyegaran (generasi AI) sedang berjalan. Harap tunggu.' })}\n\n`);
    res.end();
    return;
  }

  const ESTIMATED_SECONDS: Record<string, number> = {
    initialize: 18, crawl: 16, clean: 14, save_sources: 13,
    chunk: 12, embed: 10, store_vectors: 8, retrieve_generate: 6,
    fact_check: 3, moderate: 2, publish: 1, generate_fallback: 6,
  };
  const sendEvent = (event: string, payload: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const pipelineJob = await createPipelineJob({
      type: 'full_pipeline',
      input: { topics: [], count: 5, subtopicMap: null },
    });

    sendEvent('start', { jobId: pipelineJob.id, estimatedSeconds: 20 });

    const { disciplines, subtopicMap } = resolveFilterToTopics(targetFilterType, targetFilterValue);

    const result = await executePipeline(
      {
        topics: disciplines,
        count: 5,
        pipelineJobId: pipelineJob.id,
        subtopicMap,
      },
      (step, progress) => {
        const estimatedSeconds = ESTIMATED_SECONDS[step] || 0;
        sendEvent('progress', { step, progress, estimatedSeconds });
      }
    );

    await invalidateUserCache(userId);

    const enrichedPublishedCards = await enrichCardInteractions(result.publishedCards || [], userId);
    sendEvent('complete', { cards: enrichedPublishedCards, source: 'pipeline' });
  } catch (error: any) {
    console.error('[FeedRefreshSSE] Pipeline error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Gagal menghasilkan konten feed via AI pipeline' })}\n\n`);
  } finally {
    try {
      await redis.del(lockKey);
    } catch (delErr: any) {
      console.error('[FeedRefreshSSE] Failed to delete Redis lock:', delErr.message);
    }
    res.end();
  }
});

export = router;
