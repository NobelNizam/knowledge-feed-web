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

const getUserId = (req: Request): number | null => (req.user ? req.user.userId : null);

// ponytail: batch-resolve domain names → IDs for DB queries
async function resolveDomainIds(names: string[]): Promise<number[]> {
  if (!names || names.length === 0) return [];
  const domains = await prisma.domain.findMany({
    where: { name: { in: names } },
    select: { id: true },
  });
  return domains.map((d) => d.id);
}

const cardInclude = {
  domain: { select: { name: true } },
  hashtags: { include: { tag: { select: { name: true } } } },
};

/**
 * Memperkaya (enrich) daftar kartu pengetahuan dengan data interaksi pengguna
 * ponytail: DRY helper untuk interaksi kartu
 */
async function enrichCardInteractions(cards: any[], userId: string | null) {
  if (!cards || cards.length === 0) return [];

  const userIdNum = userId ? parseInt(userId, 10) : undefined;
  const cardIds = cards.map((c) => c.id);

  const [likeReactions, dislikeReactions, userLikes, userDislikes, comments, bookmarks] = await Promise.all([
    prisma.reaction.groupBy({
      by: ['postId'],
      where: { postId: { in: cardIds }, reactionType: 'LIKE' },
      _count: { id: true },
    }),
    prisma.reaction.groupBy({
      by: ['postId'],
      where: { postId: { in: cardIds }, reactionType: 'DISLIKE' },
      _count: { id: true },
    }),
    userIdNum
      ? prisma.reaction.findMany({ where: { userId: userIdNum, postId: { in: cardIds }, reactionType: 'LIKE' } })
      : Promise.resolve([]),
    userIdNum
      ? prisma.reaction.findMany({ where: { userId: userIdNum, postId: { in: cardIds }, reactionType: 'DISLIKE' } })
      : Promise.resolve([]),
    prisma.comment.groupBy({
      by: ['postId'],
      where: { postId: { in: cardIds }, isDeleted: false },
      _count: { id: true },
    }),
    userIdNum
      ? prisma.bookmark.findMany({ where: { userId: userIdNum, postId: { in: cardIds } }, select: { postId: true } })
      : Promise.resolve([]),
  ]);

  const likesMap = Object.fromEntries(likeReactions.map((l) => [l.postId, l._count.id]));
  const dislikesMap = Object.fromEntries(dislikeReactions.map((d) => [d.postId, d._count.id]));
  const likedSet = new Set(userLikes.map((ul) => ul.postId));
  const dislikedSet = new Set(userDislikes.map((ud) => ud.postId));
  const commentsMap = Object.fromEntries(comments.map((c) => [c.postId, c._count.id]));
  const savedSet = new Set(bookmarks.map((b) => b.postId));

  return cards.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    domain: row.domain?.name ?? '',
    tags: row.hashtags?.map((ph: any) => ph.tag?.name).filter(Boolean) ?? [],
    sourceUrl: row.sourceUrl || row.source_url,
    sourceName: row.sourceName || row.source_name,
    aiModel: row.aiModel || row.ai_model,
    generatedAt: row.generatedAt || row.generated_at,
    viewCount: row.viewCount || row.view_count,
    saveCount: row.saveCount || row.save_count || 0,
    shareCount: row.shareCount || row.share_count || 0,
    repostCount: row.repostCount || row.repost_count || 0,
    engagementScore: row.engagementScore || row.engagement_score,
    factChecked: row.factChecked || row.fact_checked,
    factCheckScore: row.factCheckScore || row.fact_check_score,
    moderationStatus: row.moderationStatus || row.moderation_status,
    sourceChunkIds: row.sourceChunkIds || row.source_chunk_ids,
    citations: row.citations,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
    likeCount: likesMap[row.id] || 0,
    dislikeCount: dislikesMap[row.id] || 0,
    liked: likedSet.has(row.id),
    disliked: dislikedSet.has(row.id),
    saved: savedSet.has(row.id),
    commentsCount: commentsMap[row.id] || 0,
  }));
}

async function populateCacheIfNeeded(domainTarget: string, domainNames: string[] | null) {
  try {
    let domainIds: number[] | undefined;
    if (domainNames && domainNames.length > 0) {
      domainIds = await resolveDomainIds(domainNames);
    }
    const cards = await prisma.knowledgeCard.findMany({
      where: domainIds ? { domainId: { in: domainIds } } : undefined,
      include: cardInclude,
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

    let excludeNums: number[] = [];
    if (seenIds) {
      excludeNums = String(seenIds).split(',').filter((id) => id.trim() !== '').map(Number);
    }

    let cachedCards = await getDomainCache(domainTarget);

    if (!cachedCards || cachedCards.length === 0) {
      cachedCards = await populateCacheIfNeeded(domainTarget, domainFilter);
    }

    let cards: any[] = [];
    let usedCache = false;

    if (cachedCards && cachedCards.length > 0) {
      const excludeSet = new Set(excludeNums);
      const filtered = cachedCards.filter((card: any) => !excludeSet.has(card.id));
      if (filtered.length >= limit) {
        cards = filtered.slice(0, limit);
        usedCache = true;
      } else if (filtered.length > 0 && filtered.length < limit) {
        cards = filtered;
      }
    }

    if (!usedCache) {
      let domainIds: number[] | undefined;
      if (domainFilter) {
        domainIds = await resolveDomainIds(domainFilter);
      }
      const dbCards = await prisma.knowledgeCard.findMany({
        where: {
          domainId: domainIds ? { in: domainIds } : undefined,
          id: excludeNums.length > 0 ? { notIn: excludeNums } : undefined,
        },
        include: cardInclude,
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
    const excludeNums: number[] = (seenIds || []).map(Number);

    let cachedCards = await getDomainCache(domainTarget);
    if (!cachedCards || cachedCards.length === 0) {
      cachedCards = await populateCacheIfNeeded(domainTarget, domains);
    }

    let cards: any[] = [];
    let usedCache = false;

    if (cachedCards && cachedCards.length > 0) {
      const excludeSet = new Set(excludeNums);
      const filtered = cachedCards.filter((card: any) => !excludeSet.has(card.id));
      if (filtered.length >= limit) {
        cards = filtered.slice(0, limit);
        usedCache = true;
      } else if (filtered.length > 0) {
        cards = filtered;
      }
    }

    if (!usedCache) {
      const domainIds = await resolveDomainIds(domains);
      const dbCards = await prisma.knowledgeCard.findMany({
        where: {
          domainId: { in: domainIds },
          id: excludeNums.length > 0 ? { notIn: excludeNums } : undefined,
        },
        include: cardInclude,
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
      const userIdNum = parseInt(String(req.user!.userId), 10);
      const follows = await prisma.userFollowDomain.findMany({
        where: { userId: userIdNum },
        include: { domain: { select: { name: true } } },
      });
      if (follows.length > 0) {
        targetFilterType = 'preferences';
        targetFilterValue = follows.map((f: any) => f.domain.name);
        console.log(`[FeedRefresh] Loading preferences for user ${userIdNum}: [${targetFilterValue.join(', ')}]`);
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
  const userIdNum = parseInt(String(req.user!.userId), 10);

  let targetFilterType = filterType;
  let targetFilterValue: string | string[] = filterValue;
  if (filterType === 'all') {
    const follows = await prisma.userFollowDomain.findMany({
      where: { userId: userIdNum },
      include: { domain: { select: { name: true } } },
    });
    if (follows.length > 0) {
      targetFilterType = 'preferences';
      targetFilterValue = follows.map((f: any) => f.domain.name);
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

  let viewedCardIds: number[] = [];
  try {
    const views = await prisma.postView.findMany({ where: { userId: userIdNum }, select: { postId: true } });
    viewedCardIds = views.map((v) => v.postId);
  } catch (err: any) {
    console.error('[FeedRefreshSSE] Error loading user views:', err.message);
  }

  const querySeenIds = seenIds ? String(seenIds).split(',').filter((id) => id.trim() !== '').map(Number) : [];
  const allSeenIds = Array.from(new Set([...viewedCardIds, ...querySeenIds]));

  let availableCards: any[] = [];
  try {
    let domainIds: number[] | undefined;
    if (domainFilter && domainFilter.length > 0) {
      const domains = await prisma.domain.findMany({
        where: { name: { in: domainFilter } },
        select: { id: true },
      });
      domainIds = domains.map((d) => d.id);
    }
    availableCards = await prisma.knowledgeCard.findMany({
      where: {
        domainId: domainIds ? { in: domainIds } : undefined,
        id: allSeenIds.length > 0 ? { notIn: allSeenIds } : undefined,
        moderationStatus: 'approved',
      },
      include: cardInclude,
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
    const enrichedCards = await enrichCardInteractions(availableCards, String(userIdNum));
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

  const lockKey = `lock:refresh:user:${userIdNum}`;
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

    await invalidateUserCache(String(userIdNum));

    const enrichedPublishedCards = await enrichCardInteractions(result.publishedCards || [], String(userIdNum));
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

export default router;
