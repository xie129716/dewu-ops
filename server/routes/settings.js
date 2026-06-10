const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getSystemConfig, setSystemConfig } = require('../services/storage');

// Admin secret for system config (set via env or defaults to a simple key)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dewu-admin-2026';

router.use(authMiddleware);

// Get system config status (masked — just shows which keys are set)
router.get('/status', (req, res) => {
  try {
    res.json({
      bailian: !!(process.env.DASHSCOPE_API_KEY || getSystemConfig('bailian_api_key')),
      deepseek: !!(process.env.DEEPSEEK_API_KEY || getSystemConfig('deepseek_api_key')),
      img65535: !!(process.env.IMG65535_API_KEY || getSystemConfig('img65535_api_key')),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set system API keys (admin only)
router.post('/apikeys', (req, res) => {
  try {
    const { adminSecret, bailian_api_key, deepseek_api_key, img65535_api_key } = req.body;
    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: '管理员密码错误' });
    }
    if (bailian_api_key) setSystemConfig('bailian_api_key', bailian_api_key);
    if (deepseek_api_key) setSystemConfig('deepseek_api_key', deepseek_api_key);
    if (img65535_api_key) setSystemConfig('img65535_api_key', img65535_api_key);
    res.json({ success: true, message: 'API Keys 配置成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: run SQL migration manually (points, etc)
router.post('/migrate', (req, res) => {
  try {
    const { adminSecret } = req.body;
    if (adminSecret !== ADMIN_SECRET) return res.status(403).json({ error: '管理员密码错误' });
    // Just touching storage triggers migration
    require('../services/storage').getDB();
    res.json({ success: true, message: '迁移完成' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
