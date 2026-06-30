const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/jwtSecrets');
const authMiddleware = require('../middleware/auth');

const prisma = require('../lib/prisma');

// GET /api/knowledge/search - Search cards
router.get('/search', async (req, res) => {
  try {
    const { q, domain, limit = 20 } = req.query;

    const cards = await prisma.knowledgeCard.findMany({
      where: {
        AND: [
          q ? { title: { contains: q, mode: 'insensitive' } } : {},
          domain ? { domain } : {},
        ],
      },
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search cards' });
  }
});

// GET /api/knowledge/trending - Get trending cards
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const cards = await prisma.knowledgeCard.findMany({
      where: { createdAt: { gte: weekAgo } },
      orderBy: { engagementScore: 'desc' },
      take: parseInt(limit),
    });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ error: 'Failed to fetch trending cards' });
  }
});

// GET /api/knowledge/domains - Get all domains
router.get('/domains', async (req, res) => {
  try {
    const domains = await prisma.knowledgeCard.groupBy({
      by: ['domain'],
      _count: { id: true },
    });

    const domainNames = domains.map(d => d.domain);
    res.json({ success: true, data: domainNames });
  } catch (error) {
    console.error('Domains error:', error);
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// GET /api/knowledge/tags - Get all unique tags (YAGNI/Ponytail)
router.get('/tags', async (req, res) => {
  try {
    const cards = await prisma.knowledgeCard.findMany({
      select: { tags: true }
    });
    const allTags = Array.from(new Set(cards.flatMap(c => c.tags || [])));
    res.json({ success: true, data: allTags });
  } catch (error) {
    console.error('Tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/knowledge/:id - Get single card
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const card = await prisma.knowledgeCard.findUnique({
      where: { id },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Menyertakan data likes count, views count, comments count, dan status liked/saved user jika terautentikasi
    let liked = false;
    let saved = false;

    // Coba deteksi token JWT jika dikirimkan lewat cookie/header
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        // Cek status like
        const userLikeCount = await prisma.like.count({
          where: { userId, cardId: id }
        });
        liked = userLikeCount > 0;

        // Cek status save/bookmark
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { savedCards: { where: { id } } }
        });
        saved = user && user.savedCards.length > 0;
      } catch (e) {
        // Abaikan
      }
    }

    const likeCount = await prisma.like.count({
      where: { cardId: id }
    });

    const commentsCount = await prisma.comment.count({
      where: { cardId: id }
    });

    const responseData = {
      ...card,
      likeCount,
      liked,
      saved,
      saveCount: card.saveCount || 0, // ponytail: menggunakan kolom denormalisasi
      commentsCount
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Helper untuk menghitung dan memperbarui engagement score
async function updateEngagementScore(cardId) {
  try {
    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId },
      include: {
        likes: true,
        views: true,
        comments: true,
      }
    });
    
    if (!card) return;
    
    const likesCount = card.likes.length;
    const commentsCount = card.comments.length;
    const viewsCount = card.viewCount;
    const sharesCount = card.shareCount;
    
    const engagementScore = (likesCount * 3) + (commentsCount * 5) + (viewsCount * 1) + (sharesCount * 4);
    
    await prisma.knowledgeCard.update({
      where: { id: cardId },
      data: { engagementScore }
    });
  } catch (error) {
    console.error('Failed to update engagement score:', error);
  }
}

// POST /api/knowledge/:id/like - Toggle like
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id: cardId } = req.params;
    const userId = req.user.userId;

    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_cardId: { userId, cardId }
      }
    });

    let liked = false;
    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id
        }
      });
    } else {
      await prisma.like.create({
        data: { userId, cardId }
      });
      liked = true;
    }

    const likeCount = await prisma.like.count({
      where: { cardId }
    });

    await updateEngagementScore(cardId);

    res.json({ success: true, liked, likeCount });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/knowledge/:id/view - Record view
router.post('/:id/view', async (req, res) => {
  try {
    const { id: cardId } = req.params;
    
    let userId = null;
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {
        // Abaikan
      }
    }

    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    let isNewUniqueView = false;

    if (userId) {
      const existingView = await prisma.view.findUnique({
        where: {
          userId_cardId: { userId, cardId }
        }
      });

      if (!existingView) {
        await prisma.view.create({
          data: { userId, cardId }
        });
        isNewUniqueView = true;
      }
    } else {
      isNewUniqueView = true;
    }

    let updatedCard = card;
    if (isNewUniqueView) {
      updatedCard = await prisma.knowledgeCard.update({
        where: { id: cardId },
        data: {
          viewCount: { increment: 1 }
        }
      });
      
      await updateEngagementScore(cardId);
    }

    res.json({ success: true, viewCount: updatedCard.viewCount });
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// POST /api/knowledge/:id/share - Increment share count
router.post('/:id/share', async (req, res) => {
  try {
    const { id: cardId } = req.params;

    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const updatedCard = await prisma.knowledgeCard.update({
      where: { id: cardId },
      data: {
        shareCount: { increment: 1 }
      }
    });

    await updateEngagementScore(cardId);

    res.json({ success: true, shareCount: updatedCard.shareCount });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// GET /api/knowledge/:id/comments - Get comments
router.get('/:id/comments', async (req, res) => {
  try {
    const { id: cardId } = req.params;

    const comments = await prisma.comment.findMany({
      where: {
        cardId,
        parentId: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/knowledge/:id/comments - Add comment
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id: cardId } = req.params;
    const userId = req.user.userId;
    const { text, parentId } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const card = await prisma.knowledgeCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: text,
        userId,
        cardId,
        parentId: parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await updateEngagementScore(cardId);

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;


