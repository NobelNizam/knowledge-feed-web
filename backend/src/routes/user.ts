import express, { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth';

import prisma from '../lib/prisma';

const router: Router = express.Router();

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

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: { domains, readingLevel },
      create: { userId, domains, readingLevel },
    });

    res.json({ success: true, data: preferences });
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { savedCards: { where: { id: cardId } } },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isSaved = user.savedCards.length > 0;

    let updatedUser;
    if (isSaved) {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { savedCards: { disconnect: { id: cardId } } },
        include: { savedCards: true },
      });
      await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: { saveCount: { decrement: 1 } },
      });
    } else {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { savedCards: { connect: { id: cardId } } },
        include: { savedCards: true },
      });
      await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: { saveCount: { increment: 1 } },
      });
    }

    res.json({ success: true, data: updatedUser.savedCards });
  } catch (error) {
    console.error('Save card error:', error);
    res.status(500).json({ error: 'Failed to toggle saved card' });
  }
});

// PUT /api/user/profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, avatarUrl } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nama tidak boleh kosong' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        id: { not: userId },
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Nama profil tersebut sudah digunakan pengguna lain' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), avatarUrl },
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
});

// GET /api/user (list) — placeholder kept for backward compat
router.get('/', async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented' });
});

export = router;
