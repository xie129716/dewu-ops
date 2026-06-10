const express = require('express');
const path = require('path');
const router = express.Router();
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');
const { recognizeProductStream, recognizeProduct } = require('../services/bailian');

router.use(authMiddleware);

// Upload image
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    res.json({
      success: true,
      imageUrl: `/uploads/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recognize product — non-streaming (for workflow)
router.post('/recognize', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });
    const localPath = path.join(__dirname, '..', imageUrl);
    const result = await recognizeProduct(localPath);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recognize product — SSE streaming
router.post('/recognize/stream', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });
    const localPath = path.join(__dirname, '..', imageUrl);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let fullText = '';
    const stream = await recognizeProductStream(localPath);
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ content, fullText })}\n\n`);
      }
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
