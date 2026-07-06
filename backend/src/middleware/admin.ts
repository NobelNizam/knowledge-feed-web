import { Request, Response, NextFunction } from 'express';

const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
    return;
  }
  res.status(403).json({ error: 'Access denied. Admin privileges required.' });
};

export = adminMiddleware;
