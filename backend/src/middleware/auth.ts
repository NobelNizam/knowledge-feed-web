import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../lib/jwtSecrets';

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role?: 'USER' | 'ADMIN' };
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch {
    res.status(400).json({ error: 'Invalid or expired token.' });
  }
};

export default authMiddleware;
