const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getSystemConfig, setSystemConfig } = require('../services/storage');

router.use(authMiddleware);

// Get system config status (all users can see)
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
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: '仅管理员可配置 API Key' });
  }
  try {
    const { bailian_api_key, deepseek_api_key, img65535_api_key } = req.body;
    if (bailian_api_key) setSystemConfig('bailian_api_key', bailian_api_key);
    if (deepseek_api_key) setSystemConfig('deepseek_api_key', deepseek_api_key);
    if (img65535_api_key) setSystemConfig('img65535_api_key', img65535_api_key);
    res.json({ success: true, message: 'API Keys 配置成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
