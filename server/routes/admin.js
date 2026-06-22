const express = require('express');
const router = express.Router();
const {
  getDB,
  getSystemConfig,
  setSystemConfig,
  listRoles,
  listPermissions,
  getRoleById,
  setUserRoles,
  listPlatforms,
  listTemplates,
  setPlatformEnabled,
} = require('../services/storage');
const { hashPassword } = require('../services/auth');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);
router.use(authMiddleware.requireAdmin);

router.get('/apikeys', authMiddleware.requirePermission('config.view'), (req, res) => {
  try {
    res.json({
      bailian: !!(process.env.DASHSCOPE_API_KEY || getSystemConfig('bailian_api_key')),
      deepseek: !!(process.env.DEEPSEEK_API_KEY || getSystemConfig('deepseek_api_key')),
      img65535: !!(process.env.IMG65535_API_KEY || getSystemConfig('img65535_api_key')),
      bailian_masked: maskKey(process.env.DASHSCOPE_API_KEY || getSystemConfig('bailian_api_key')),
      deepseek_masked: maskKey(process.env.DEEPSEEK_API_KEY || getSystemConfig('deepseek_api_key')),
      img65535_masked: maskKey(process.env.IMG65535_API_KEY || getSystemConfig('img65535_api_key')),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/apikeys', authMiddleware.requirePermission('config.manage'), (req, res) => {
  try {
    const { bailian_api_key, deepseek_api_key, img65535_api_key } = req.body;
    if (bailian_api_key !== undefined) setSystemConfig('bailian_api_key', bailian_api_key);
    if (deepseek_api_key !== undefined) setSystemConfig('deepseek_api_key', deepseek_api_key);
    if (img65535_api_key !== undefined) setSystemConfig('img65535_api_key', img65535_api_key);
    res.json({ success: true, message: '保存成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authMiddleware.requirePermission('user.view'), (req, res) => {
  try {
    const db = getDB();
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    let where = '1=1';
    const params = [];
    if (search) {
      where = 'username LIKE ?';
      params.push(`%${search}%`);
    }

    const total = db.prepare(`SELECT COUNT(*) as count FROM users WHERE ${where}`).get(...params).count;
    const rows = db.prepare(`SELECT id, username, points, is_admin, created_at FROM users WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);

    const roleMap = new Map();
    db.prepare(`
      SELECT ur.user_id, r.key, r.name
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
    `).all().forEach(row => {
      if (!roleMap.has(row.user_id)) roleMap.set(row.user_id, []);
      roleMap.get(row.user_id).push({ key: row.key, name: row.name });
    });

    res.json({
      total,
      page,
      pageSize,
      list: rows.map(row => ({
        ...row,
        roles: roleMap.get(row.id) || [],
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id', authMiddleware.requirePermission('user.view'), (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id, username, points, is_admin, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', authMiddleware.requirePermission('user.manage'), async (req, res) => {
  try {
    const db = getDB();
    const { points, password, username } = req.body;
    const id = parseInt(req.params.id);

    if (points !== undefined) db.prepare('UPDATE users SET points = ? WHERE id = ?').run(parseInt(points), id);
    if (username) db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id);
    if (password) {
      const hash = await hashPassword(password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    }
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/roles', authMiddleware.requirePermission('role.manage'), (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const roleIds = Array.isArray(req.body.roleIds) ? req.body.roleIds.map(Number).filter(Boolean) : [];
    const validRoleIds = roleIds.filter(roleId => !!getRoleById(roleId));
    setUserRoles(id, validRoleIds);
    res.json({ success: true, message: '角色更新成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/roles', authMiddleware.requirePermission('role.manage'), (req, res) => {
  try {
    res.json({ list: listRoles() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/permissions', authMiddleware.requirePermission('role.manage'), (req, res) => {
  try {
    res.json({ list: listPermissions() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/platforms', authMiddleware.requirePermission('config.view'), (req, res) => {
  try {
    res.json({ list: listPlatforms() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/platforms/:key', authMiddleware.requirePermission('config.manage'), (req, res) => {
  try {
    const platform = setPlatformEnabled(req.params.key, !!req.body.enabled);
    if (!platform) return res.status(404).json({ error: '平台不存在' });
    res.json({ success: true, platform });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/templates', authMiddleware.requirePermission('template.view'), (req, res) => {
  try {
    res.json({ list: listTemplates({ enabledOnly: false }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', authMiddleware.requirePermission('config.view'), (req, res) => {
  try {
    const db = getDB();
    const row = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) as userCount,
        (SELECT COUNT(*) FROM history) as historyCount,
        (SELECT COALESCE(SUM(points),0) FROM users) as totalPoints,
        (SELECT COUNT(*) FROM checkins WHERE check_date = date('now')) as todayCheckins,
        (SELECT COUNT(*) FROM tasks) as taskCount,
        (SELECT COUNT(*) FROM templates) as templateCount
    `).get();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

module.exports = router;
