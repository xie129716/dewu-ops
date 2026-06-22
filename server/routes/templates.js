const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  cloneTemplate,
} = require('../services/storage');
const { buildCopyPromptPreview, buildImagePromptPreview } = require('../services/prompts');

router.use(authMiddleware);

router.get('/', authMiddleware.requirePermission('template.view'), (req, res) => {
  try {
    const platformKey = req.query.platformKey || '';
    const enabledOnly = req.query.enabledOnly !== 'false';
    res.json({ list: listTemplates({ platformKey, enabledOnly }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware.requirePermission('template.view'), (req, res) => {
  try {
    const template = getTemplateById(parseInt(req.params.id, 10));
    if (!template) return res.status(404).json({ error: '模板不存在' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware.requirePermission('template.manage'), (req, res) => {
  try {
    const template = createTemplate({
      ...req.body,
      created_by: req.user.id,
      template_type: req.body.template_type || 'custom',
    });
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware.requirePermission('template.manage'), (req, res) => {
  try {
    const template = updateTemplate(parseInt(req.params.id, 10), req.body);
    if (!template) return res.status(404).json({ error: '模板不存在' });
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/clone', authMiddleware.requirePermission('template.manage'), (req, res) => {
  try {
    const template = cloneTemplate(parseInt(req.params.id, 10), {
      ...req.body,
      created_by: req.user.id,
    });
    if (!template) return res.status(404).json({ error: '模板不存在' });
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/preview-prompts', authMiddleware.requirePermission('prompt.view_manual'), (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    const { productInfo = {}, copyResult = {}, platformKey, variables = {}, copyPromptOverride = '', imagePromptOverride = '' } = req.body;
    const copyPrompt = buildCopyPromptPreview({ productInfo, platformKey, templateId, variables, promptOverride: copyPromptOverride });
    const imagePrompt = buildImagePromptPreview({ productInfo, copyResult, platformKey, templateId, variables, promptOverride: imagePromptOverride });
    res.json({ success: true, copyPrompt, imagePrompt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
