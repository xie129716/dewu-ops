const express = require('express');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { submitImageTask, submitImageEdit, getTaskStatus } = require('../services/img65535');
const { deductPoints, updateHistoryStatus } = require('../services/storage');
const { buildImagePromptPreview } = require('../services/prompts');
const {
  createQueuedTask,
  markTaskRunning,
  markTaskWaitingExternal,
  markTaskCompleted,
  markTaskFailed,
} = require('../services/tasks');

const POINT_COST = 8;

router.use(authMiddleware);

router.post('/preview-prompt', authMiddleware.requirePermission('prompt.view_manual'), (req, res) => {
  try {
    const { brand, productName, category, description, copyResult, platformKey, templateId, variables, promptOverride } = req.body;
    if (!brand || !productName || !category) {
      return res.status(400).json({ error: '缺少必要参数：brand, productName, category' });
    }
    const preview = buildImagePromptPreview({
      productInfo: { brand, productName, category, description },
      copyResult,
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

router.post('/generate', authMiddleware.requirePoints(POINT_COST), authMiddleware.requirePermission('image.generate'), async (req, res) => {
  const task = createQueuedTask({
    type: 'image_generate',
    source: 'manual',
    user_id: req.user.id,
    platform_key: req.body.platformKey || 'dewu',
    template_id: req.body.templateId || null,
    input_json: req.body,
  });

  try {
    markTaskRunning(task.id, { progress_message: '正在提交纯文生图任务' });
    const { prompt, size, platformKey } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });
    const result = await submitImageTask({ prompt, size }, req.user.id);
    deductPoints(req.user.id, POINT_COST);
    const waitingTask = markTaskWaitingExternal(task.id, {
      external_job_id: result.jobId,
      prompt_snapshot_json: { userPrompt: prompt },
      progress_message: '已提交至外部生图服务，等待完成',
    });
    res.json({ success: true, cost: POINT_COST, task: waitingTask, platformKey: platformKey || 'dewu', ...result });
  } catch (err) {
    markTaskFailed(task.id, err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/edit', authMiddleware.requirePoints(POINT_COST), authMiddleware.requirePermission('image.generate'), async (req, res) => {
  const task = createQueuedTask({
    type: 'image_generate',
    source: 'manual',
    user_id: req.user.id,
    platform_key: req.body.platformKey || 'dewu',
    template_id: req.body.templateId || null,
    input_json: req.body,
    history_id: req.body.historyId || null,
  });

  try {
    markTaskRunning(task.id, { progress_message: '正在提交参考图生图任务' });
    const { imageUrl, prompt, size, historyId, platformKey, templateId } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });
    if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });
    const imagePath = path.join(__dirname, '..', imageUrl);
    const result = await submitImageEdit({ imagePath, prompt, size }, req.user.id);
    deductPoints(req.user.id, POINT_COST);
    const waitingTask = markTaskWaitingExternal(task.id, {
      external_job_id: result.jobId,
      prompt_snapshot_json: { userPrompt: prompt },
      history_id: historyId || null,
      progress_message: '已提交至外部生图服务，等待完成',
    });
    if (historyId) {
      updateHistoryStatus(req.user.id, historyId, {
        status: 'pending_image',
        job_id: result.jobId,
        task_id: waitingTask.id,
        platform_key: platformKey || 'dewu',
        template_id: templateId || null,
        prompt_snapshot_json: { imagePrompt: prompt },
      });
    }
    res.json({ success: true, cost: POINT_COST, task: waitingTask, platformKey: platformKey || 'dewu', ...result });
  } catch (err) {
    markTaskFailed(task.id, err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:jobId', async (req, res) => {
  try {
    const result = await getTaskStatus(req.params.jobId, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks/:taskId/sync', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const task = req.body.task || null;
    if (!taskId) return res.status(400).json({ error: '缺少 taskId' });
    const status = await getTaskStatus(req.body.externalJobId || task?.external_job_id, req.user.id);
    if (status.status === 'done') {
      const completedTask = markTaskCompleted(taskId, {
        output_json: status,
        progress_message: '图片生成已完成',
      });
      return res.json({ success: true, task: completedTask, ...status });
    }
    if (status.status === 'failed') {
      const failedTask = markTaskFailed(taskId, new Error(status.errorMessage || '图片生成失败'), {
        output_json: status,
      });
      return res.json({ success: true, task: failedTask, ...status });
    }
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
