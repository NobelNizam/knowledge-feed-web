import { Request, Response, NextFunction } from 'express';

const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // No Origin/Referer = same-origin request (browsers don't send these headers
  // for same-origin POST). Also covers server-to-server and test requests.
  if (!origin && !referer) {
    next();
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  let hostname: string | null = null;
  try {
    if (origin) {
      hostname = new URL(origin).hostname;
    } else if (referer) {
      hostname = new URL(referer).hostname;
    }
  } catch {
    hostname = null;
  }

  if (!hostname) {
    res.status(403).json({ error: 'Invalid Origin or Referer header' });
    return;
  }

  let expectedHostname: string;
  try {
    expectedHostname = new URL(frontendUrl).hostname;
  } catch {
    expectedHostname = 'localhost';
  }

  if (
    hostname === expectedHostname ||
    (process.env.NODE_ENV !== 'production' && hostname === 'localhost')
  ) {
    next();
    return;
  }

  res.status(403).json({ error: 'Cross-site request rejected' });
};

export = csrfMiddleware;
