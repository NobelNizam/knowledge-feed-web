const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Try to get token from HttpOnly cookie first, fallback to Auth header
  const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    req.user = decoded; // { userId: "cuid" }
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
