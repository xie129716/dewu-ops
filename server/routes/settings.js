const express = require('express');
const router = express.Router();
const { saveSetting, getSetting, getAllSettings } = require('../services/storage');

// Save API keys
router.post('/apikeys', (req, res) => {
  try {
    const { bailian_api_key, deepseek_api_key, img65535_api_key } = req.body;

    if (bailian_api_key !== undefined) saveSetting('bailian_api_key', bailian_api_key);
    if (deepseek_api_key !== undefined) saveSetting('deepseek_api_key', deepseek_api_key);
    if (img65535_api_key !== undefined) saveSetting('img65535_api_key', img65535_api_key);

    res.json({ success: true, message: 'API Keys 保存成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get API keys (masked)
router.get('/apikeys', (req, res) => {
  try {
    const keys = {
      bailian_api_key: maskKey(getSetting('bailian_api_key')),
      deepseek_api_key: maskKey(getSetting('deepseek_api_key')),
      img65535_api_key: maskKey(getSetting('img65535_api_key')),
    };
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check API key status
router.get('/status', (req, res) => {
  try {
    res.json({
      bailian: !!getSetting('bailian_api_key'),
      deepseek: !!getSetting('deepseek_api_key'),
      img65535: !!getSetting('img65535_api_key'),
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
