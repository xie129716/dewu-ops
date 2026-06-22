const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { generateCopy, generateCopyStream } = require('../services/deepseek');
const { deductPoints } = require('../services/storage');
const { initSSE, streamToSSE, sseError } = require('../services/sse');
const { buildCopyPromptPreview } = require('../services/prompts');

const POINT_COST = 4;
router.use(authMiddleware);

router.post('/preview-prompt', authMiddleware.requirePermission('prompt.view_manual'), (req, res) => {
  try {
    const { brand, productName, category, description, platformKey, templateId, variables, promptOverride } = req.body;
    if (!brand || !productName || !category) {
      return res.status(400).json({ error: '缺少必要参数：brand, productName, category' });
    }
    const preview = buildCopyPromptPreview({
      productInfo: { brand, productName, category, description },
      platformKey,
      templateId,
      variables,
      promptOverride,
    });
    res.json({ success: true, ...preview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', authMiddleware.requirePoints(POINT_COST), authMiddleware.requirePermission('copy.generate'), async (req, res) => {
  try {
    const { brand, productName, category, description, style, platformKey, templateId, variables, promptOverride } = req.body;
    if (!brand || !productName || !category) {
      return res.status(400).json({ error: '缺少必要参数：brand, productName, category' });
    }
    const promptPreview = buildCopyPromptPreview({
      productInfo: { brand, productName, category, description },
      platformKey,
      templateId,
      variables,
      promptOverride,
    });
    const result = await generateCopy(
      { brand, productName, category, description },
      {
        style,
        platformKey,
        templateId,
        variables,
        systemPrompt: promptPreview.systemPrompt,
        userPrompt: promptPreview.userPrompt,
      }
    );
    deductPoints(req.user.id, POINT_COST);
    res.json({ success: true, cost: POINT_COST, prompt: promptPreview, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate/stream', authMiddleware.requirePoints(POINT_COST), authMiddleware.requirePermission('copy.generate'), async (req, res) => {
  try {
    const { brand, productName, category, description, style, platformKey, templateId, variables, promptOverride } = req.body;
    if (!brand || !productName || !category) {
      return res.status(400).json({ error: '缺少必要参数：brand, productName, category' });
    }
    const promptPreview = buildCopyPromptPreview({
      productInfo: { brand, productName, category, description },
      platformKey,
      templateId,
      variables,
      promptOverride,
    });
    initSSE(res);
    const stream = await generateCopyStream(
      { brand, productName, category, description },
      {
        style,
        platformKey,
        templateId,
        variables,
        systemPrompt: promptPreview.systemPrompt,
        userPrompt: promptPreview.userPrompt,
      }
    );
    await streamToSSE(res, stream);
    deductPoints(req.user.id, POINT_COST);
    res.write(`data: ${JSON.stringify({ done: true, cost: POINT_COST, prompt: promptPreview })}\n\n`);
    res.end();
  } catch (err) {
    sseError(res, err);
  }
});

module.exports = router;
