const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { analyzeTrends, bilibiliRanking } = require('../services/trending');

router.use(authMiddleware);

// Run full trending analysis for a category
router.post('/analyze', async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: '请选择品类' });

    const results = await analyzeTrends(category);
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick Bilibili ranking
router.get('/bilibili', (req, res) => {
  try {
    const items = bilibiliRanking();
    res.json({ success: true, items: items.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
