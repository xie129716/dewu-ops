const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { listPlatforms, getPlatformByKey } = require('../services/storage');

router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    res.json({ list: listPlatforms().filter(platform => platform.enabled) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:key', (req, res) => {
  try {
    const platform = getPlatformByKey(req.params.key);
    if (!platform || !platform.enabled) return res.status(404).json({ error: '平台不存在' });
    res.json(platform);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
