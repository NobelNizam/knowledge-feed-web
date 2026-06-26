const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/user/:id - Get user profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { preferences: true, savedCards: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/user - Create new user
router.post('/', async (req, res) => {
  try {
    const { name, domains } = req.body;

    const user = await prisma.user.create({
      data: {
        name,
        preferences: {
          create: { domains },
        },
      },
      include: { preferences: true },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/user/:id/preferences - Update preferences
router.put('/:id/preferences', async (req, res) => {
  try {
    const { id } = req.params;
    const { domains, readingLevel } = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId: id },
      update: { domains, readingLevel },
      create: { userId: id, domains, readingLevel },
    });

    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/user/:id/save - Save a card
router.post('/:id/save', async (req, res) => {
  try {
    const { id } = req.params;
    const { cardId } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        savedCards: { connect: { id: cardId } },
      },
      include: { savedCards: true },
    });

    res.json({ success: true, data: user.savedCards });
  } catch (error) {
    console.error('Save card error:', error);
    res.status(500).json({ error: 'Failed to save card' });
  }
});

module.exports = router;
