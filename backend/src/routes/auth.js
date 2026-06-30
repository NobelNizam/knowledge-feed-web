const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');

const prisma = require('../lib/prisma');
const { JWT_SECRET, REFRESH_TOKEN_SECRET } = require('../lib/jwtSecrets');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

const crypto = require('crypto');

const setTokenCookie = (req, res, token, isRefresh = false) => {
  const maxAge = isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000;
  const cookieName = isRefresh ? 'refreshToken' : 'token';
  const isSecure = process.env.NODE_ENV === 'production' || 
                   req.secure || 
                   req.headers['x-forwarded-proto'] === 'https';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge
  });
};

const generateTokens = async (userId, role, req) => {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const refreshToken = jwt.sign({ userId, role, jti: uniqueId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      expiresAt,
    }
  });
  
  return { accessToken, refreshToken };
};

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // ponytail: validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        preferences: {
          create: { domains: [] },
        },
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        preferences: true
      },
    });

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, req);
    setTokenCookie(req, res, accessToken, false);
    setTokenCookie(req, res, refreshToken, true);
    
    res.status(201).json({ success: true, user });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { preferences: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, req);
    setTokenCookie(req, res, accessToken, false);
    setTokenCookie(req, res, refreshToken, true);
    
    // Dynamic fallback for user preferences if it is null
    let userPreferences = user.preferences;
    if (!userPreferences) {
      userPreferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          domains: [],
        }
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    userWithoutPassword.preferences = userPreferences;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    await prisma.session.deleteMany({ where: { refreshToken } }).catch(() => {});
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ success: true });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;
  
  const clearCookies = () => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  };

  if (!refreshToken) {
    clearCookies();
    return res.status(401).json({ error: 'Refresh token not found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    
    if (!session) {
      clearCookies();
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      clearCookies();
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Generate new access token
    const accessToken = jwt.sign({ userId: decoded.userId, role: decoded.role }, JWT_SECRET, { expiresIn: '15m' });
    setTokenCookie(req, res, accessToken, false);
    
    res.json({ success: true });
  } catch (error) {
    clearCookies();
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { preferences: true, savedCards: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Dynamic fallback for user preferences if it is null
    if (!user.preferences) {
      user.preferences = await prisma.userPreferences.create({
        data: {
          userId: user.id,
          domains: [],
        }
      });
    }

    const { password, ...userWithoutPassword } = user;
    
    // Enrich savedCards dengan data interaksi dinamis (Ponytail / YAGNI)
    if (user.savedCards && user.savedCards.length > 0) {
      const cardIds = user.savedCards.map(c => c.id);
      const [likes, userLikes, comments] = await Promise.all([
        prisma.like.groupBy({
          by: ['cardId'],
          where: { cardId: { in: cardIds } },
          _count: { id: true }
        }),
        prisma.like.findMany({
          where: { userId: user.id, cardId: { in: cardIds } }
        }),
        prisma.comment.groupBy({
          by: ['cardId'],
          where: { cardId: { in: cardIds } },
          _count: { id: true }
        })
      ]);

      const likesMap = Object.fromEntries(likes.map(l => [l.cardId, l._count.id]));
      const likedSet = new Set(userLikes.map(ul => ul.cardId));
      const commentsMap = Object.fromEntries(comments.map(c => [c.cardId, c._count.id]));

      userWithoutPassword.savedCards = user.savedCards.map(row => ({
        ...row,
        likeCount: likesMap[row.id] || 0,
        liked: likedSet.has(row.id),
        saved: true,
        commentsCount: commentsMap[row.id] || 0
      }));
    }

    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

module.exports = router;

