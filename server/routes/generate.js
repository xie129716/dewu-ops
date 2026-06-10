const express = require('express');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { submitImageTask, submitImageEdit, getTaskStatus } = require('../services/img65535');
const { deductPoints } = require('../services/storage');

const POINT_COST = 8;

router.use(authMiddleware);

router.post('/generate', authMiddleware.requirePoints(POINT_COST), async (req, res) => {
  try {
    const { prompt, size } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });
    const result = await submitImageTask({ prompt, size });
    deductPoints(req.user.id, POINT_COST);
    res.json({ success: true, cost: POINT_COST, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/edit', authMiddleware.requirePoints(POINT_COST), async (req, res) => {
  try {
    const { imageUrl, prompt, size } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });
    if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });
    const imagePath = path.join(__dirname, '..', imageUrl);
    const result = await submitImageEdit({ imagePath, prompt, size });
    deductPoints(req.user.id, POINT_COST);
    res.json({ success: true, cost: POINT_COST, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:jobId', async (req, res) => {
  try {
    const result = await getTaskStatus(req.params.jobId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
