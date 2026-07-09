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

// ---- validation helpers ----

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]+$/;
const SUSPICIOUS_RE = /(<script|<\/script|--|\bDROP\s+TABLE\b|\bALTER\s+TABLE\b|\bEXEC\s*\()/i;

const sanitize = (s: string): string => s.trim();
const stripHtml = (s: string): string => s.replace(/<[^>]*>/g, '');

function suspicious(s: string): boolean {
  return SUSPICIOUS_RE.test(s);
}

// ---- token helpers (unchanged) ----

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

// ponytail: keep the select shape in one place
const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  role: true,
  readingLevel: true,
  followedDomains: { include: { domain: { select: { id: true, name: true } } } },
} as const;

// ---- routes ----

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username: rawUsername, displayName: rawName, email: rawEmail, password: rawPassword } = req.body || {};

    // ---- required fields ----
    if (!rawUsername || !rawName || !rawPassword) {
      return res.status(400).json({ error: 'Username, display name, and password are required' });
    }

    // ---- sanitize ----
    const username = sanitize(String(rawUsername));
    const displayName = stripHtml(sanitize(String(rawName)));
    const password = String(rawPassword);
    const email = rawEmail ? sanitize(String(rawEmail)) : null;

    // ---- suspicious check ----
    if (suspicious(username) || suspicious(displayName) || (email && suspicious(email))) {
      return res.status(400).json({ error: 'Input contains disallowed patterns' });
    }

    // ---- username validation ----
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    // ---- displayName validation ----
    if (displayName.length < 1 || displayName.length > 100) {
      return res.status(400).json({ error: 'Display name must be 1-100 characters' });
    }

    // ---- email validation (optional) ----
    if (email) {
      if (email.length > 254) {
        return res.status(400).json({ error: 'Email must be at most 254 characters' });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // ---- password validation ----
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters' });
    }

    // ---- uniqueness checks ----
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already in use' });
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        email,
        passwordHash: hashedPassword,
      },
      select: USER_SELECT,
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
    const { login, password } = req.body || {};

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const loginStr = sanitize(String(login));
    const passwordStr = String(password);

    if (suspicious(loginStr)) {
      return res.status(400).json({ error: 'Input contains disallowed patterns' });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: loginStr }, { email: loginStr }] },
      select: { ...USER_SELECT, passwordHash: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    const isMatch = await bcrypt.compare(passwordStr, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, req);
    setTokenCookie(req, res, accessToken, false);
    setTokenCookie(req, res, refreshToken, true);

    const { passwordHash: _, ...userWithoutPassword } = user;
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
      include: {
        followedDomains: { include: { domain: { select: { id: true, name: true } } } },
        bookmarks: { include: { post: true } },
        reposts: { include: { post: true } },
        _count: { select: { followers: true, following: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, bookmarks: userBookmarks, reposts: userReposts, _count, ...cleanUser } = user;
    const bookmarkedPosts = userBookmarks.map((b) => b.post);
    const repostedPosts = userReposts.map((r) => r.post);
    const allPostIds = [...new Set([...bookmarkedPosts.map((p) => p.id), ...repostedPosts.map((p) => p.id)])];

    if (allPostIds.length > 0) {
      const [reactions, userReactions, comments] = await Promise.all([
        prisma.reaction.groupBy({ by: ['postId'], where: { postId: { in: allPostIds }, reactionType: 'LIKE' }, _count: { id: true } }),
        prisma.reaction.findMany({ where: { userId: user.id, postId: { in: allPostIds }, reactionType: 'LIKE' } }),
        prisma.comment.groupBy({ by: ['postId'], where: { postId: { in: allPostIds } }, _count: { id: true } }),
      ]);

      const likesMap = Object.fromEntries(reactions.map((l) => [l.postId, l._count.id]));
      const likedSet = new Set(userReactions.map((ul) => ul.postId));
      const commentsMap = Object.fromEntries(comments.map((c) => [c.postId, c._count.id]));

      const enrichedBookmarks = bookmarkedPosts.map((row) => ({
        ...row,
        likeCount: likesMap[row.id] || 0,
        liked: likedSet.has(row.id),
        saved: true,
        commentsCount: commentsMap[row.id] || 0,
      }));

      const enrichedReposts = repostedPosts.map((row) => ({
        ...row,
        likeCount: likesMap[row.id] || 0,
        liked: likedSet.has(row.id),
        saved: false,
        commentsCount: commentsMap[row.id] || 0,
      }));

      res.json({
        success: true,
        data: {
          ...cleanUser,
          followerCount: _count.followers,
          followingCount: _count.following,
          followedDomains: user.followedDomains,
          bookmarks: enrichedBookmarks,
          reposts: enrichedReposts,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          ...cleanUser,
          followerCount: _count.followers,
          followingCount: _count.following,
          followedDomains: user.followedDomains,
          bookmarks: [],
          reposts: [],
        },
      });
    }
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

export default router;
