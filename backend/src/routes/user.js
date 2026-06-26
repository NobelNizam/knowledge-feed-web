const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();

// Protect all user routes
router.use(authMiddleware);

// PUT /api/user/preferences - Update preferences
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { domains, readingLevel } = req.body;

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

// POST /api/user/save - Save or unsave a card
router.post('/save', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cardId } = req.body;

    // Check if already saved
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { savedCards: { where: { id: cardId } } }
    });

    const isSaved = user.savedCards.length > 0;

    let updatedUser;
    if (isSaved) {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { savedCards: { disconnect: { id: cardId } } },
        include: { savedCards: true },
      });
    } else {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { savedCards: { connect: { id: cardId } } },
        include: { savedCards: true },
      });
    }

    res.json({ success: true, data: updatedUser.savedCards });
  } catch (error) {
    console.error('Save card error:', error);
    res.status(500).json({ error: 'Failed to toggle saved card' });
  }
});

module.exports = router;
