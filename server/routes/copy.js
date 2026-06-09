const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { generateCopy } = require('../services/deepseek');

router.use(authMiddleware);

router.post('/generate', async (req, res) => {
  try {
    const { brand, productName, category, style, keywords } = req.body;
    if (!brand || !productName || !category) {
      return res.status(400).json({ error: '缺少必要参数：brand, productName, category' });
    }
    const result = await generateCopy(
      { brand, productName, category },
      { style, keywords },
      req.user.id
    );
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
