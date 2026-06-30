const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/jwtSecrets');

const authMiddleware = (req, res, next) => {
  // Try to get token from HttpOnly cookie first, fallback to Auth header
  const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId: "cuid" }
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
