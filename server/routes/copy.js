const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { generateCopy, generateCopyStream } = require('../services/deepseek');
const { deductPoints } = require('../services/storage');

const POINT_COST = 4;

router.use(authMiddleware);

// Non-streaming (for workflow)
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

// SSE streaming
router.post('/generate/stream', authMiddleware.requirePoints(POINT_COST), async (req, res) => {
  try {
    const { brand, productName, category, style, keywords } = req.body;
    if (!brand || !productName || !category) {
      return res.status(400).json({ error: '缺少必要参数：brand, productName, category' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let fullText = '';
    const stream = await generateCopyStream({ brand, productName, category }, { style, keywords });
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ content, fullText })}\n\n`);
      }
    }
    deductPoints(req.user.id, POINT_COST);
    res.write(`data: ${JSON.stringify({ done: true, cost: POINT_COST })}\n\n`);
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
