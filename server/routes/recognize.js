const express = require('express');
const path = require('path');
const router = express.Router();
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');
const { recognizeProduct, recognizeProductStream } = require('../services/bailian');
const { initSSE, streamToSSE, sseError } = require('../services/sse');

router.use(authMiddleware);

router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    res.json({ success: true, imageUrl: `/uploads/${req.file.filename}`, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recognize', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });
    const result = await recognizeProduct(path.join(__dirname, '..', imageUrl));
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recognize/stream', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });
    initSSE(res);
    const stream = await recognizeProductStream(path.join(__dirname, '..', imageUrl));
    await streamToSSE(res, stream);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    sseError(res, err);
  }
});

module.exports = router;
