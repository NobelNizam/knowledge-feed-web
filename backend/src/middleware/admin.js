const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
};

module.exports = adminMiddleware;
