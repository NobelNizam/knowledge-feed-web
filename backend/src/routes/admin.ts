import express, { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth';
import adminMiddleware from '../middleware/admin';
import { invalidateDomainCache } from '../services/cacheService';

import prisma from '../lib/prisma';

const router: Router = express.Router();

// Apply auth and admin middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// 1. Meng-aktifkan/menonaktifkan pipeline AI
router.post('/pipeline/status', async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

// 2. Mengatur konfigurasi fact-check atau sumber terpercaya
router.post('/config/fact-check', async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Not implemented yet' });
});

// 3. Melihat jumlah akun user yang terbuat dan jumlah online
router.get('/stats/users', async (_req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const onlineUsers = await prisma.session.count({
      where: { expiresAt: { gt: new Date() } },
    });
    res.json({ success: true, data: { totalUsers, onlineUsers } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// 4. Menghapus konten feed tertentu
router.delete('/feed/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
  try {
    const card = await prisma.knowledgeCard.findUnique({
      where: { id },
      select: { domainId: true, domain: { select: { name: true } } },
    });
    if (!card) return res.status(404).json({ error: 'Content not found' });

    await prisma.knowledgeCard.delete({ where: { id } });
    await invalidateDomainCache(card.domain.name);

    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content or content not found' });
  }
});

// 5. Melihat inbox report dari user
router.get('/reports', async (_req: Request, res: Response) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { id: true, displayName: true, email: true } },
        reportedPost: { select: { id: true, title: true, domainId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = reports.map((r) => ({
      id: r.id,
      reportedPostId: r.reportedPostId,
      cardTitle: r.reportedPost?.title,
      reporterName: r.reporter?.displayName,
      reporterEmail: r.reporter?.email,
      reason: r.reason,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// 6. Dismiss report
router.delete('/reports/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  try {
    await prisma.report.delete({ where: { id } });
    res.json({ success: true, message: 'Report dismissed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss report' });
  }
});

export default router;
