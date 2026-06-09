const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { saveSetting, getSetting } = require('../services/storage');

// All settings routes require auth
router.use(authMiddleware);

// Save API keys
router.post('/apikeys', (req, res) => {
  try {
    const { bailian_api_key, deepseek_api_key, img65535_api_key } = req.body;
    const uid = req.user.id;

    if (bailian_api_key !== undefined) saveSetting(uid, 'bailian_api_key', bailian_api_key);
    if (deepseek_api_key !== undefined) saveSetting(uid, 'deepseek_api_key', deepseek_api_key);
    if (img65535_api_key !== undefined) saveSetting(uid, 'img65535_api_key', img65535_api_key);

    res.json({ success: true, message: 'API Keys 保存成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get API keys (masked)
router.get('/apikeys', (req, res) => {
  try {
    const uid = req.user.id;
    res.json({
      bailian_api_key: maskKey(getSetting(uid, 'bailian_api_key')),
      deepseek_api_key: maskKey(getSetting(uid, 'deepseek_api_key')),
      img65535_api_key: maskKey(getSetting(uid, 'img65535_api_key')),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check API key status
router.get('/status', (req, res) => {
  try {
    const uid = req.user.id;
    res.json({
      bailian: !!getSetting(uid, 'bailian_api_key'),
      deepseek: !!getSetting(uid, 'deepseek_api_key'),
      img65535: !!getSetting(uid, 'img65535_api_key'),
    });
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
