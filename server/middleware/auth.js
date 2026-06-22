const { verifyToken } = require('../services/auth');
const { getUserPoints } = require('../services/storage');
const { buildUserAccess } = require('../services/permissions');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    const access = buildUserAccess(decoded.id);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      isAdmin: access.isAdmin,
      roles: access.roles,
      permissions: access.permissions,
      roleKeys: access.roleKeys,
      permissionKeys: access.permissionKeys,
      points: getUserPoints(decoded.id),
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function requirePoints(cost) {
  return (req, res, next) => {
    const current = getUserPoints(req.user.id);
    req.user.points = current;
    if (current < cost) {
      return res.status(402).json({ error: `积分不足，需要 ${cost} 积分，当前 ${current} 积分` });
    }
    req._pointCost = cost;
    next();
  };
}

authMiddleware.requirePoints = requirePoints;

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (req.user.permissionKeys.includes(permissionKey) || req.user.roleKeys.includes('super_admin')) {
      return next();
    }
    return res.status(403).json({ error: `缺少权限：${permissionKey}` });
  };
}

authMiddleware.requirePermission = requirePermission;

function requireAnyPermission(permissionKeys = []) {
  return (req, res, next) => {
    if (req.user.roleKeys.includes('super_admin')) return next();
    if (permissionKeys.some(key => req.user.permissionKeys.includes(key))) return next();
    return res.status(403).json({ error: '权限不足' });
  };
}

authMiddleware.requireAnyPermission = requireAnyPermission;

function requireAdmin(req, res, next) {
  if (req.user.roleKeys.includes('super_admin') || req.user.roleKeys.includes('ops_admin')) {
    return next();
  }
  return res.status(403).json({ error: '仅管理员可访问' });
}

authMiddleware.requireAdmin = requireAdmin;

module.exports = authMiddleware;
