const { verifyToken } = require('../services/auth');
const { getUserPoints } = require('../services/storage');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, username: decoded.username, isAdmin: decoded.isAdmin, points: getUserPoints(decoded.id) };
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

/**
 * Middleware factory: require minimum points to proceed.
 * Usage: router.post('/xxx', requirePoints(8), handler)
 */
function requirePoints(cost) {
  return (req, res, next) => {
    // Reload points from DB for accuracy
    const current = getUserPoints(req.user.id);
    req.user.points = current;
    if (current < cost) {
      return res.status(402).json({ error: `积分不足，需要 ${cost} 积分，当前 ${current} 积分` });
    }
    // Store cost for deduction after success
    req._pointCost = cost;
    next();
  };
}

authMiddleware.requirePoints = requirePoints;

function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) return res.status(403).json({ error: '仅管理员可访问' });
  next();
}
authMiddleware.requireAdmin = requireAdmin;

module.exports = authMiddleware;

