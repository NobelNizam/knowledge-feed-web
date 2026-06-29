const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

const crypto = require('crypto');

const setTokenCookie = (res, token, isRefresh = false) => {
  const maxAge = isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000;
  const cookieName = isRefresh ? 'refreshToken' : 'token';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);
    
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
    setTokenCookie(res, accessToken, false);
    setTokenCookie(res, refreshToken, true);
    
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
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token not found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Generate new access token
    const accessToken = jwt.sign({ userId: decoded.userId, role: decoded.role }, JWT_SECRET, { expiresIn: '15m' });
    setTokenCookie(res, accessToken, false);
    
    res.json({ success: true });
  } catch (error) {
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
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

module.exports = router;
