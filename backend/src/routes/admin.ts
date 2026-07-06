import express, { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth';
import adminMiddleware from '../middleware/admin';

import prisma from '../lib/prisma';

const router: Router = express.Router();

// Apply auth and admin middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// 1. Meng-aktifkan/menonaktifkan pipeline AI
router.post('/pipeline/status', async (req: Request, res: Response) => {
  const { active } = req.body || {};
  // TODO: Implement actual logic to toggle background AI worker
  res.json({ success: true, message: `AI Pipeline has been ${active ? 'activated' : 'deactivated'}` });
});

// 2. Mengatur konfigurasi fact-check atau sumber terpercaya
router.post('/config/fact-check', async (req: Request, res: Response) => {
  const { config } = req.body || {};
  // TODO: Implement logic to update trusted sources config
  res.json({ success: true, message: 'Fact-check configuration updated successfully' });
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
  const { id } = req.params;
  try {
    await prisma.knowledgeCard.delete({ where: { id } });
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content or content not found' });
  }
});

// 5. Melihat inbox report dari user
router.get('/reports', async (_req: Request, res: Response) => {
  // TODO: Implement actual table and logic for user reports
  res.json({ success: true, data: [] });
});

export = router;
