const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getSystemConfig } = require('../services/storage');

router.use(authMiddleware);

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

module.exports = router;
