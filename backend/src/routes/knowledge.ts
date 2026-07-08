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

    let domainId: number | undefined;
    if (domain) {
      const domainRow = await prisma.domain.findUnique({
        where: { name: String(domain) },
        select: { id: true },
      });
      domainId = domainRow?.id;
    }

    const cards = await prisma.knowledgeCard.findMany({
      where: {
        AND: [
          q ? { title: { contains: String(q), mode: 'insensitive' } } : {},
          domain ? { domainId: domainId ?? -1 } : {},
        ],
      },
      include: { domain: { select: { name: true } } },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: cards.map((c) => ({ ...c, domain: c.domain?.name ?? c.domain })),
    });
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
      include: { domain: { select: { name: true } } },
      orderBy: { engagementScore: 'desc' },
      take: limit,
    });

    res.json({
      success: true,
      data: cards.map((c) => ({ ...c, domain: c.domain?.name ?? c.domain })),
    });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending cards' });
  }
});

// GET /api/knowledge/domains
router.get('/domains', async (_req: Request, res: Response) => {
  try {
    const domains = await prisma.domain.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });

    res.json({ success: true, data: domains });
  } catch (error) {
    console.error('Domains error:', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// GET /api/knowledge/tags
router.get('/tags', async (_req: Request, res: Response) => {
  try {
    const hashtags = await prisma.hashtag.findMany({
      select: { name: true },
      distinct: ['name'],
    });
    res.json({ success: true, data: hashtags.map((h) => h.name) });
  } catch (error) {
    console.error('Tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/knowledge/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);

    let userId: string | null = null;
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        userId = (jwt.verify(token, JWT_SECRET) as { userId: string }).userId;
      } catch {
        // ignore
      }
    }
    const userIdNum = userId ? parseInt(userId, 10) : undefined;

    const queries: any[] = [
      prisma.knowledgeCard.findUnique({
        where: { id: postId },
        include: {
          domain: { select: { name: true } },
          postHashtags: { include: { hashtag: { select: { name: true } } } },
        },
      }),
      prisma.reaction.count({ where: { postId, reactionType: 'LIKE' } }),
      prisma.comment.count({ where: { postId, isDeleted: false } }),
      prisma.reaction.count({ where: { postId, reactionType: 'DISLIKE' } }),
    ];
    if (userIdNum) {
      queries.push(prisma.reaction.count({ where: { userId: userIdNum, postId, reactionType: 'LIKE' } }));
      queries.push(prisma.reaction.count({ where: { userId: userIdNum, postId, reactionType: 'DISLIKE' } }));
      queries.push(prisma.bookmark.findFirst({ where: { userId: userIdNum, postId }, select: { id: true } }));
    }

    const [card, likeCount, commentsCount, dislikeCount, userLikeCount, userDislikeCount, bookmark] =
      await Promise.all(queries);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const liked = userIdNum ? userLikeCount > 0 : false;
    const disliked = userIdNum ? userDislikeCount > 0 : false;
    const saved = userIdNum ? !!bookmark : false;

    res.json({
      success: true,
      data: {
        ...card,
        domain: card.domain?.name ?? card.domain ?? '',
        tags: card.postHashtags?.map((ph: any) => ph.hashtag?.name).filter(Boolean) ?? [],
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

async function updateEngagementScore(postId: number) {
  try {
    const [card, likesCount, dislikesCount, commentsCount] = await Promise.all([
      prisma.knowledgeCard.findUnique({
        where: { id: postId },
        select: { viewCount: true, shareCount: true },
      }),
      prisma.reaction.count({ where: { postId, reactionType: 'LIKE' } }),
      prisma.reaction.count({ where: { postId, reactionType: 'DISLIKE' } }),
      prisma.comment.count({ where: { postId, isDeleted: false } }),
    ]);

    if (!card) return;

    const engagementScore =
      likesCount * 3 + dislikesCount * -3 + commentsCount * 5 + card.viewCount * 1 + card.shareCount * 4;

    await prisma.knowledgeCard.update({
      where: { id: postId },
      data: { engagementScore },
    });
  } catch (error) {
    console.error('Failed to update engagement score:', error);
  }
}

// POST /api/knowledge/:id/like
router.post('/:id/like', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);
    const userIdNum = parseInt(String(req.user!.userId), 10);

    const card = await prisma.knowledgeCard.findUnique({ where: { id: postId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const existingLike = await prisma.reaction.findFirst({
      where: { userId: userIdNum, postId, reactionType: 'LIKE' },
    });

    let liked = false;
    if (existingLike) {
      await prisma.reaction.delete({ where: { id: existingLike.id } });
    } else {
      await prisma.reaction.deleteMany({
        where: { userId: userIdNum, postId, reactionType: 'DISLIKE' },
      });
      await prisma.reaction.create({
        data: { userId: userIdNum, postId, reactionType: 'LIKE' },
      });
      liked = true;
    }

    const likeCount = await prisma.reaction.count({ where: { postId, reactionType: 'LIKE' } });
    await updateEngagementScore(postId);

    res.json({ success: true, liked, likeCount });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/knowledge/:id/view
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);

    let userId: string | null = null;
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        userId = (jwt.verify(token, JWT_SECRET) as { userId: string }).userId;
      } catch {
        // ignore
      }
    }
    const userIdNum = userId ? parseInt(userId, 10) : undefined;

    const card = await prisma.knowledgeCard.findUnique({ where: { id: postId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    let isNewUniqueView = false;

    if (userIdNum) {
      const existingView = await prisma.postView.findUnique({
        where: { userId_postId: { userId: userIdNum, postId } },
      });

      if (!existingView) {
        await prisma.postView.create({ data: { userId: userIdNum, postId } });
        isNewUniqueView = true;
      }
    } else {
      const fingerprint = { ip: req.ip, ua: req.headers['user-agent'] };
      isNewUniqueView = await markAnonymousViewIfNew(fingerprint, id);
    }

    let updatedCard = card;
    if (isNewUniqueView) {
      updatedCard = await prisma.knowledgeCard.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      });
      await updateEngagementScore(postId);
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
    const { id } = req.params;
    const postId = parseInt(id, 10);

    const card = await prisma.knowledgeCard.findUnique({ where: { id: postId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const updatedCard = await prisma.knowledgeCard.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });

    await updateEngagementScore(postId);

    res.json({ success: true, shareCount: updatedCard.shareCount });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// POST /api/knowledge/:id/dislike
router.post('/:id/dislike', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);
    const userIdNum = parseInt(String(req.user!.userId), 10);

    const card = await prisma.knowledgeCard.findUnique({ where: { id: postId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const existingDislike = await prisma.reaction.findFirst({
      where: { userId: userIdNum, postId, reactionType: 'DISLIKE' },
    });

    let disliked = false;
    if (existingDislike) {
      await prisma.reaction.delete({ where: { id: existingDislike.id } });
    } else {
      // mutual exclusive: auto-hapus like
      await prisma.reaction.deleteMany({
        where: { userId: userIdNum, postId, reactionType: 'LIKE' },
      });

      await prisma.reaction.create({
        data: { userId: userIdNum, postId, reactionType: 'DISLIKE' },
      });
      disliked = true;

      // auto-flag: dislike pertama → system report "tidak disukai"
      const dislikeCount = await prisma.reaction.count({ where: { postId, reactionType: 'DISLIKE' } });
      if (dislikeCount === 1) {
        const sysUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (sysUser) {
          await prisma.report.create({
            data: {
              reporterUserId: sysUser.id,
              reportedPostId: postId,
              reason: 'tidak disukai',
              status: 'pending',
            },
          });
        }
      }
    }

    const [likeCount, dislikeCount] = await Promise.all([
      prisma.reaction.count({ where: { postId, reactionType: 'LIKE' } }),
      prisma.reaction.count({ where: { postId, reactionType: 'DISLIKE' } }),
    ]);

    await updateEngagementScore(postId);

    res.json({ success: true, disliked, dislikeCount, likeCount });
  } catch (error) {
    console.error('Dislike error:', error);
    res.status(500).json({ error: 'Failed to toggle dislike' });
  }
});

// POST /api/knowledge/:id/report
router.post('/:id/report', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postId = parseInt(id, 10);
    const userIdNum = parseInt(String(req.user!.userId), 10);
    const { reasons, reason, description } = req.body || {};

    // ponytail: accept either single reason or legacy reasons array, pick first
    const reportReason =
      reason
      || (Array.isArray(reasons) && reasons.length > 0 ? reasons[0] : null);

    if (!reportReason) {
      return res.status(400).json({ error: 'Minimal satu alasan report diperlukan' });
    }

    const validReasons = ['tidak akurat', 'bahasanya jelek', 'duplikat', 'error', 'tidak pantas', 'tidak disukai'];
    if (!validReasons.includes(reportReason)) {
      return res.status(400).json({ error: 'Alasan report tidak valid' });
    }

    const card = await prisma.knowledgeCard.findUnique({ where: { id: postId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const report = await prisma.report.create({
      data: {
        reporterUserId: userIdNum,
        reportedPostId: postId,
        reason: reportReason,
        description: description || null,
        status: 'pending',
      },
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
    const { id } = req.params;
    const postId = parseInt(id, 10);

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null, isDeleted: false },
      include: {
        user: { select: { id: true, name: true } },
        replies: {
          where: { isDeleted: false },
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
    const { id } = req.params;
    const postId = parseInt(id, 10);
    const userIdNum = parseInt(String(req.user!.userId), 10);
    const { text, parentId } = req.body || {};

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const card = await prisma.knowledgeCard.findUnique({ where: { id: postId } });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parseInt(String(parentId), 10) } });
      if (!parentComment) return res.status(404).json({ error: 'Parent comment not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        content: text,
        userId: userIdNum,
        postId,
        parentId: parentId ? parseInt(String(parentId), 10) : null,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    await updateEngagementScore(postId);

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
