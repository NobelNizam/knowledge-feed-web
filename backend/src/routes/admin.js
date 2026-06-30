const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const prisma = require('../lib/prisma');

// Apply auth and admin middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// 1. Meng-aktifkan/menonaktifkan pipeline AI
router.post('/pipeline/status', async (req, res) => {
  const { active } = req.body;
  // TODO: Implement actual logic to toggle background AI worker
  res.json({ success: true, message: `AI Pipeline has been ${active ? 'activated' : 'deactivated'}` });
});

// 2. Mengatur konfigurasi fact-check atau sumber terpercaya
router.post('/config/fact-check', async (req, res) => {
  const { config } = req.body;
  // TODO: Implement logic to update trusted sources config
  res.json({ success: true, message: 'Fact-check configuration updated successfully' });
});

// 3. Melihat jumlah akun user yang terbuat dan jumlah online
router.get('/stats/users', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    // Assuming "online" users have a session that expires in the future
    const onlineUsers = await prisma.session.count({
      where: { expiresAt: { gt: new Date() } }
    });
    res.json({ success: true, data: { totalUsers, onlineUsers } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// 4. Menghapus konten feed tertentu
router.delete('/feed/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.knowledgeCard.delete({ where: { id } });
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content or content not found' });
  }
});

// 5. Melihat inbox report dari user
router.get('/reports', async (req, res) => {
  // TODO: Implement actual table and logic for user reports
  res.json({ success: true, data: [] });
});

module.exports = router;

