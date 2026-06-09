const express = require('express');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { submitImageTask, submitImageEdit, getTaskStatus } = require('../services/img65535');

router.use(authMiddleware);

// Submit text-to-image generation
router.post('/generate', async (req, res) => {
  try {
    const { prompt, size } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });
    const result = await submitImageTask({ prompt, size }, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit image-to-image generation
router.post('/edit', async (req, res) => {
  try {
    const { imageUrl, prompt, size } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数（参考图）' });
    if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });
    const imagePath = path.join(__dirname, '..', imageUrl);
    const result = await submitImageEdit({ imagePath, prompt, size }, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Poll task status
router.get('/status/:jobId', async (req, res) => {
  try {
    const result = await getTaskStatus(req.params.jobId, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
