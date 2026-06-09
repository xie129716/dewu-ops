const express = require('express');
const path = require('path');
const router = express.Router();
const upload = require('../middleware/upload');
const { recognizeProduct } = require('../services/bailian');

// Upload image
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recognize product from image
router.post('/recognize', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: '缺少 imageUrl 参数' });
    }

    // Convert relative URL path to absolute local file path
    const localPath = path.join(__dirname, '..', imageUrl);
    const result = await recognizeProduct(localPath);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
