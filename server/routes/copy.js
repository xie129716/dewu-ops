const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { generateCopy } = require('../services/deepseek');
const { deductPoints } = require('../services/storage');

const POINT_COST = 4;

router.use(authMiddleware);

router.post('/generate', authMiddleware.requirePoints(POINT_COST), async (req, res) => {
  try {
    const { brand, productName, category, style, keywords } = req.body;
    if (!brand || !productName || !category) {
      return res.status(400).json({ error: '缺少必要参数：brand, productName, category' });
    }
    const result = await generateCopy({ brand, productName, category }, { style, keywords });
    deductPoints(req.user.id, POINT_COST);
    res.json({ success: true, cost: POINT_COST, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
