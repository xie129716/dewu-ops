const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getDB, getSystemConfig, setSystemConfig } = require('../services/storage');

// All routes require admin
router.use(authMiddleware);
router.use((req, res, next) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: '仅管理员可访问' });
  next();
});

// ---- API Keys ----
router.get('/apikeys', (req, res) => {
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

router.post('/apikeys', (req, res) => {
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

// ---- Users ----
router.get('/users', (req, res) => {
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

    res.json({ total, page, pageSize, list: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/:id', (req, res) => {
  try {
    const db = getDB();
    const user = db.prepare('SELECT id, username, points, is_admin, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id', (req, res) => {
  try {
    const db = getDB();
    const { points, password, username } = req.body;
    const id = parseInt(req.params.id);

    if (points !== undefined) {
      db.prepare('UPDATE users SET points = ? WHERE id = ?').run(parseInt(points), id);
    }
    if (username) {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id);
    }
    if (password) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    }
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Stats ----
router.get('/stats', (req, res) => {
  try {
    const db = getDB();
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const historyCount = db.prepare('SELECT COUNT(*) as count FROM history').get().count;
    const totalPoints = db.prepare('SELECT SUM(points) as total FROM users').get().total || 0;
    const todayCheckins = db.prepare("SELECT COUNT(*) as count FROM checkins WHERE check_date = date('now')").get().count;
    res.json({ userCount, historyCount, totalPoints, todayCheckins });
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
