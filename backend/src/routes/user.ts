import express, { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth';

import prisma from '../lib/prisma';

const router: Router = express.Router();

// GET /api/user/:id — public profile (no auth required)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user id' });

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true, username: true, displayName: true, bio: true, avatarUrl: true, createdAt: true,
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    let isFollowing = false;
    if (req.cookies?.token) {
      try {
        const jwt = await import('jsonwebtoken');
        const { JWT_SECRET } = await import('../lib/jwtSecrets');
        const decoded = jwt.default.verify(req.cookies.token, JWT_SECRET) as { userId: number };
        const follow = await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: decoded.userId, followingId: targetId } },
        });
        isFollowing = !!follow;
      } catch {}
    }

    res.json({
      success: true,
      data: { ...user, followerCount: user._count.followers, followingCount: user._count.following, isFollowing },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/user/:id/followers — public
router.get('/:id/followers', async (req: Request, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user id' });
    const followers = await prisma.follow.findMany({
      where: { followingId: targetId },
      include: { follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    res.json({ success: true, data: followers.map(f => f.follower) });
  } catch (error) {
    console.error('Followers error:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/user/:id/following — public
router.get('/:id/following', async (req: Request, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user id' });
    const following = await prisma.follow.findMany({
      where: { followerId: targetId },
      include: { following: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    res.json({ success: true, data: following.map(f => f.following) });
  } catch (error) {
    console.error('Following error:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Protect all user routes
router.use(authMiddleware);

// ponytail: trust-boundary clamp; same shape as feed.ts. See comment there.
const clampLimit = (raw: any, max = 100, fallback = 20): number => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};

// PUT /api/user/preferences
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { domains, readingLevel = 'intermediate' } = req.body || {};

    if (!domains || !Array.isArray(domains)) {
      return res.status(400).json({ error: 'Domains must be a valid array' });
    }

    const validReadingLevels = ['beginner', 'intermediate', 'advanced'];
    if (!validReadingLevels.includes(readingLevel)) {
      return res.status(400).json({ error: 'Invalid reading level' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { readingLevel },
    });
    await prisma.userFollowDomain.deleteMany({ where: { userId } });
    if (domains.length > 0) {
      await prisma.userFollowDomain.createMany({
        data: domains.map((id: number) => ({ userId, domainId: id })),
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { followedDomains: true },
    });

    res.json({
      success: true,
      data: {
        readingLevel: user!.readingLevel,
        followedDomains: user!.followedDomains,
      },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/user/save
router.post('/save', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { cardId } = req.body || {};

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: { userId_postId: { userId, postId: cardId } },
    });

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: { userId_postId: { userId, postId: cardId } },
      });
      await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: { saveCount: { decrement: 1 } },
      });
    } else {
      await prisma.bookmark.create({
        data: { userId, postId: cardId },
      });
      await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: { saveCount: { increment: 1 } },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { bookmarks: { include: { post: true } } },
    });

    res.json({ success: true, data: updatedUser!.bookmarks.map((b) => b.post) });
  } catch (error) {
    console.error('Save card error:', error);
    res.status(500).json({ error: 'Failed to toggle saved card' });
  }
});

// PUT /api/user/profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, displayName: rawDisplayName, avatarUrl, bio } = req.body || {};
    const resolvedDisplayName = rawDisplayName || name;

    if (!resolvedDisplayName || !resolvedDisplayName.trim()) {
      return res.status(400).json({ error: 'Nama tidak boleh kosong' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        displayName: { equals: resolvedDisplayName.trim(), mode: 'insensitive' },
        id: { not: userId },
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Nama profil tersebut sudah digunakan pengguna lain' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { displayName: resolvedDisplayName.trim(), avatarUrl, bio },
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});

// POST /api/user/:id/follow — toggle follow
router.post('/:id/follow', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const targetId = Number(req.params.id);

    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user id' });
    if (userId === targetId) return res.status(400).json({ error: 'Cannot follow yourself' });

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const existingFollow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });

    if (existingFollow) {
      await prisma.follow.delete({ where: { followerId_followingId: { followerId: userId, followingId: targetId } } });
      return res.json({ success: true, followed: false });
    }

    await prisma.follow.create({ data: { followerId: userId, followingId: targetId } });
    res.json({ success: true, followed: true });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Failed to toggle follow' });
  }
});

// GET /api/user (list) — placeholder kept for backward compat
router.get('/', async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

export default router;
