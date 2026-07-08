import express, { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET } from '../lib/jwtSecrets';
import authMiddleware from '../middleware/auth';
import { getRedisConnection } from '../queue/queueManager';

import prisma from '../lib/prisma';

const router: Router = express.Router();

// ponytail: trust-boundary clamp; same shape as feed.ts. See comment there.
const clampLimit = (raw: any, max = 100, fallback = 20): number => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};

// ponytail: anonymous view dedup via Redis SETNX with 24h TTL.
// Stores a salted hash of (ip, ua, cardId) so the same visitor doesn't
// inflate viewCount on every refresh. Switch to Postgres unique constraint
// once we move the auth flow to a per-visitor device cookie.
const ANON_VIEW_TTL = 60 * 60 * 24;
const ANON_VIEW_SALT = process.env.ANON_VIEW_SALT || 'kf-anon-view';
const anonViewKey = (ip: { ip?: string; ua?: string }, cardId: string) => {
  const ua = (ip && ip.ua) || '';
  const hash = crypto
    .createHash('sha256')
    .update(`${ANON_VIEW_SALT}:${ip.ip || ''}:${ua}:${cardId}`)
    .digest('hex')
    .slice(0, 32);
  return `view:anon:${hash}`;
};

async function markAnonymousViewIfNew(ip: { ip?: string; ua?: string }, cardId: string): Promise<boolean> {
  const redis = getRedisConnection();
  if (!redis) return true;
  const key = anonViewKey(ip, cardId);
  const setRes = await redis.set(key, '1', 'EX', ANON_VIEW_TTL, 'NX');
  return setRes === 'OK';
}

// GET /api/knowledge/search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, domain } = req.query;
    const limit = clampLimit(req.query.limit);

    const cards = await prisma.knowledgeCard.findMany({
      where: {
        AND: [
          q ? { title: { contains: String(q), mode: 'insensitive' } } : {},
          domain ? { domain: String(domain) } : {},
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search cards' });
  }
});

// GET /api/knowledge/trending
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const limit = clampLimit(req.query.limit, 50, 10);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const cards = await prisma.knowledgeCard.findMany({
      where: { createdAt: { gte: weekAgo } },
      orderBy: { engagementScore: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending cards' });
  }
});

// GET /api/knowledge/domains
router.get('/domains', async (_req: Request, res: Response) => {
  try {
    const domains = await prisma.knowledgeCard.groupBy({
      by: ['domain'],
      _count: { id: true },
    });

    res.json({ success: true, data: domains.map((d) => d.domain) });
  } catch (error) {
    console.error('Domains error:', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// GET /api/knowledge/tags
router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const cards = await prisma.knowledgeCard.findMany({ select: { tags: true } });
    const allTags = Array.from(new Set(cards.flatMap((c) => c.tags || [])));
    res.json({ success: true, data: allTags });
  } catch (error) {
    console.error('Tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/knowledge/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ponytail: parallelize the 3 interaction counts + user lookup. Was 4
    // sequential queries; now one round trip. Upgrade path: denormalize
    // likeCount/commentsCount on KnowledgeCard to drop these counts entirely.
    let userId: string | null = null;
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        userId = (jwt.verify(token, JWT_SECRET) as { userId: string }).userId;
      } catch {
        // ignore
      }
    }

    const queries: any[] = [
      prisma.knowledgeCard.findUnique({ where: { id } }),
      prisma.like.count({ where: { cardId: id } }),
      prisma.comment.count({ where: { cardId: id } }),
      prisma.dislike.count({ where: { cardId: id } }),
    ];
    if (userId) {
      queries.push(prisma.like.count({ where: { userId, cardId: id } }));
      queries.push(prisma.dislike.count({ where: { userId, cardId: id } }));
      queries.push(
        prisma.user.findUnique({
          where: { id: userId },
          select: { savedCards: { where: { id }, select: { id: true } } },
        })
      );
    }

    const [card, likeCount, commentsCount, dislikeCount, userLikeCount, userDislikeCount, user] = await Promise.all(queries);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const liked = userId ? userLikeCount > 0 : false;
    const disliked = userId ? userDislikeCount > 0 : false;
    const saved = userId ? (user?.savedCards?.length || 0) > 0 : false;

    res.json({
      success: true,
      data: {
        ...card,
        likeCount,
        dislikeCount,
        liked,
        disliked,
        saved,
        saveCount: card.saveCount || 0,
        commentsCount,
      },
    });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

async function updateEngagementScore(cardId: string) {
  try {
    const [card, likesCount, dislikesCount, commentsCount] = await Promise.all([
      prisma.knowledgeCard.findUnique({
        where: { id: cardId },
        select: { viewCount: true, shareCount: true },
      }),
      prisma.like.count({ where: { cardId } }),
      prisma.dislike.count({ where: { cardId } }),
      prisma.comment.count({ where: { cardId } }),
    ]);

    if (!card) return;

    const engagementScore =
      likesCount * 3 + dislikesCount * -3 + commentsCount * 5 + card.viewCount * 1 + card.shareCount * 4;

    await prisma.knowledgeCard.update({
      where: { id: cardId },
      data: { engagementScore },
    });
  } catch (error) {
    console.error('Failed to update engagement score:', error);
  }
}

// POST /api/knowledge/:id/like
router.post('/:id/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id: cardId } = req.params;
    const userId = req.user!.userId;

    const card = await prisma.knowledgeCard.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const existingLike = await prisma.like.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });

    let liked = false;
    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
    } else {
      await prisma.like.create({ data: { userId, cardId } });
      liked = true;
    }

    const likeCount = await prisma.like.count({ where: { cardId } });
    await updateEngagementScore(cardId);

    res.json({ success: true, liked, likeCount });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/knowledge/:id/view
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const { id: cardId } = req.params;

    let userId: string | null = null;
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        userId = (jwt.verify(token, JWT_SECRET) as { userId: string }).userId;
      } catch {
        // ignore
      }
    }

    const card = await prisma.knowledgeCard.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    let isNewUniqueView = false;

    if (userId) {
      const existingView = await prisma.view.findUnique({
        where: { userId_cardId: { userId, cardId } },
      });

      if (!existingView) {
        await prisma.view.create({ data: { userId, cardId } });
        isNewUniqueView = true;
      }
    } else {
      const fingerprint = { ip: req.ip, ua: req.headers['user-agent'] };
      isNewUniqueView = await markAnonymousViewIfNew(fingerprint, cardId);
    }

    let updatedCard = card;
    if (isNewUniqueView) {
      updatedCard = await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: { viewCount: { increment: 1 } },
      });
      await updateEngagementScore(cardId);
    }

    res.json({ success: true, viewCount: updatedCard.viewCount });
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// POST /api/knowledge/:id/share
router.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const { id: cardId } = req.params;

    const card = await prisma.knowledgeCard.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const updatedCard = await prisma.knowledgeCard.update({
      where: { id: cardId },
      data: { shareCount: { increment: 1 } },
    });

    await updateEngagementScore(cardId);

    res.json({ success: true, shareCount: updatedCard.shareCount });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// POST /api/knowledge/:id/dislike
router.post('/:id/dislike', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id: cardId } = req.params;
    const userId = req.user!.userId;

    const card = await prisma.knowledgeCard.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const existingDislike = await prisma.dislike.findUnique({
      where: { userId_cardId: { userId, cardId } },
    });

    let disliked = false;
    if (existingDislike) {
      await prisma.dislike.delete({ where: { id: existingDislike.id } });
    } else {
      // mutual exclusive: auto-hapus like
      const existingLike = await prisma.like.findUnique({
        where: { userId_cardId: { userId, cardId } },
      });
      if (existingLike) {
        await prisma.like.delete({ where: { id: existingLike.id } });
      }

      await prisma.dislike.create({ data: { userId, cardId } });
      disliked = true;

      // auto-flag: dislike pertama → system report "tidak disukai"
      const dislikeCount = await prisma.dislike.count({ where: { cardId } });
      if (dislikeCount === 1) {
        const sysUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (sysUser) {
          await prisma.report.upsert({
            where: { userId_cardId: { userId: sysUser.id, cardId } },
            create: { userId: sysUser.id, cardId, reasons: ['tidak disukai'] },
            update: {},
          });
        }
      }
    }

    const [likeCount, dislikeCount] = await Promise.all([
      prisma.like.count({ where: { cardId } }),
      prisma.dislike.count({ where: { cardId } }),
    ]);

    await prisma.knowledgeCard.update({
      where: { id: cardId },
      data: { dislikeCount },
    });
    await updateEngagementScore(cardId);

    res.json({ success: true, disliked, dislikeCount, likeCount });
  } catch (error) {
    console.error('Dislike error:', error);
    res.status(500).json({ error: 'Failed to toggle dislike' });
  }
});

// POST /api/knowledge/:id/report
router.post('/:id/report', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id: cardId } = req.params;
    const userId = req.user!.userId;
    const { reasons } = req.body || {};

    if (!reasons || !Array.isArray(reasons) || reasons.length === 0) {
      return res.status(400).json({ error: 'Minimal satu alasan report diperlukan' });
    }

    const validReasons = ['tidak akurat', 'bahasanya jelek', 'duplikat', 'error', 'tidak pantas'];
    const filtered = reasons.filter((r: string) => validReasons.includes(r));
    if (filtered.length === 0) {
      return res.status(400).json({ error: 'Alasan report tidak valid' });
    }

    const card = await prisma.knowledgeCard.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const report = await prisma.report.create({
      data: { userId, cardId, reasons: filtered },
    });

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// GET /api/knowledge/:id/comments
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { id: cardId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { cardId, parentId: null },
      include: {
        user: { select: { id: true, name: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/knowledge/:id/comments
router.post('/:id/comments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id: cardId } = req.params;
    const userId = req.user!.userId;
    const { text, parentId } = req.body || {};

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const card = await prisma.knowledgeCard.findUnique({ where: { id: cardId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment) return res.status(404).json({ error: 'Parent comment not found' });
    }

    const comment = await prisma.comment.create({
      data: { content: text, userId, cardId, parentId: parentId || null },
      include: { user: { select: { id: true, name: true } } },
    });

    await updateEngagementScore(cardId);

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export = router;
