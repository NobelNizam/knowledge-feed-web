import express, { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import authMiddleware from '../middleware/auth';

import prisma from '../lib/prisma';
import { JWT_SECRET, REFRESH_TOKEN_SECRET } from '../lib/jwtSecrets';

const router: Router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

// ponytail: store SHA-256(refreshToken) in the DB, not the JWT itself.
const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const setTokenCookie = (req: Request, res: Response, token: string, isRefresh = false) => {
  const maxAge = isRefresh ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000;
  const cookieName = isRefresh ? 'refreshToken' : 'token';
  const isSecure =
    process.env.NODE_ENV === 'production' ||
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https';
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge,
  });
};

async function generateTokens(userId: number, role: string, req: Request) {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  const uniqueId = crypto.randomBytes(16).toString('hex');
  const refreshToken = jwt.sign({ userId, role, jti: uniqueId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId,
      refreshToken: hashRefreshToken(refreshToken),
      deviceInfo: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
      expiresAt,
      isRevoked: false,
    },
  });

  return { accessToken, refreshToken };
}

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, name, email, password } = req.body || {};

    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

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

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        displayName: name,
        email,
        passwordHash: hashedPassword,
      },
      select: { id: true, username: true, displayName: true, email: true, role: true, readingLevel: true, dailyDigest: true },
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

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await prisma.user.findUnique({ where: { email }, include: { followedDomains: true } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, req);
    setTokenCookie(req, res, accessToken, false);
    setTokenCookie(req, res, refreshToken, true);

    const { passwordHash: _pw, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await prisma.session
      .deleteMany({ where: { refreshToken: hashRefreshToken(refreshToken) } })
      .catch(() => {});
  }

  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.json({ success: true });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies || {};

  const clearCookies = () => {
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  };

  if (!refreshToken) {
    clearCookies();
    return res.status(401).json({ error: 'Refresh token not found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { userId: number; role: string };
    const session = await prisma.session.findUnique({
      where: { refreshToken: hashRefreshToken(refreshToken) },
    });

    if (!session) {
      clearCookies();
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      clearCookies();
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const accessToken = jwt.sign({ userId: decoded.userId, role: decoded.role }, JWT_SECRET, { expiresIn: '15m' });
    setTokenCookie(req, res, accessToken, false);

    res.json({ success: true });
  } catch (error) {
    clearCookies();
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { followedDomains: true, bookmarks: { include: { post: true } } },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, bookmarks: userBookmarks, ...cleanUser } = user;
    const bookmarkedPosts = userBookmarks.map((b) => b.post);

    if (bookmarkedPosts.length > 0) {
      const postIds = bookmarkedPosts.map((c) => c.id);
      const [reactions, userReactions, comments] = await Promise.all([
        prisma.reaction.groupBy({ by: ['postId'], where: { postId: { in: postIds }, reactionType: 'LIKE' }, _count: { id: true } }),
        prisma.reaction.findMany({ where: { userId: user.id, postId: { in: postIds }, reactionType: 'LIKE' } }),
        prisma.comment.groupBy({ by: ['postId'], where: { postId: { in: postIds } }, _count: { id: true } }),
      ]);

      const likesMap = Object.fromEntries(reactions.map((l) => [l.postId, l._count.id]));
      const likedSet = new Set(userReactions.map((ul) => ul.postId));
      const commentsMap = Object.fromEntries(comments.map((c) => [c.postId, c._count.id]));

      const enriched = bookmarkedPosts.map((row) => ({
        ...row,
        likeCount: likesMap[row.id] || 0,
        liked: likedSet.has(row.id),
        saved: true,
        commentsCount: commentsMap[row.id] || 0,
      }));

      res.json({ success: true, data: { ...cleanUser, followedDomains: user.followedDomains, bookmarks: enriched } });
    } else {
      res.json({ success: true, data: { ...cleanUser, followedDomains: user.followedDomains, bookmarks: [] } });
    }
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;
