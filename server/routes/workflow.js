const express = require('express');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { recognizeProduct } = require('../services/bailian');
const { generateCopy } = require('../services/deepseek');
const { submitImageEdit } = require('../services/img65535');
const { createHistory, deductPoints } = require('../services/storage');
const { buildCopyPromptPreview, buildImagePromptPreview } = require('../services/prompts');
const {
  createQueuedTask,
  markTaskRunning,
  markTaskWaitingExternal,
  markTaskFailed,
} = require('../services/tasks');
const { normalizePlatformKey } = require('../services/platforms');

const POINT_COST = 10;

router.use(authMiddleware);

router.post('/preview', authMiddleware.requirePermission('prompt.view_manual'), async (req, res) => {
  try {
    const { imageUrl, platformKey = 'dewu', templateId, variables = {}, copyPromptOverride = '', imagePromptOverride = '' } = req.body;
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });

    const localPath = path.join(__dirname, '..', imageUrl);
    const recognition = await recognizeProduct(localPath, req.user.id);
    const copyPrompt = buildCopyPromptPreview({
      productInfo: recognition,
      platformKey,
      templateId,
      variables,
      promptOverride: copyPromptOverride,
    });
    const imagePrompt = buildImagePromptPreview({
      productInfo: recognition,
      platformKey,
      templateId,
      variables,
      promptOverride: imagePromptOverride,
    });

    res.json({
      success: true,
      platformKey: normalizePlatformKey(platformKey),
      recognition,
      copyPrompt,
      imagePrompt,
    });
  } catch (err) {
    console.error('[Workflow Preview] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/run', authMiddleware.requirePoints(POINT_COST), authMiddleware.requirePermission('workflow.run'), async (req, res) => {
  const {
    imageUrl,
    copyStyle,
    imageSize,
    platformKey = 'dewu',
    templateId = null,
    variables = {},
  } = req.body;

  const normalizedPlatformKey = normalizePlatformKey(platformKey);
  const task = createQueuedTask({
    type: 'workflow_run',
    source: 'one_click',
    user_id: req.user.id,
    platform_key: normalizedPlatformKey,
    template_id: templateId,
    input_json: { imageUrl, copyStyle, imageSize, platformKey: normalizedPlatformKey, templateId, variables },
  });

  try {
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });

    markTaskRunning(task.id, { progress_step: 'recognize', progress_message: '正在识别商品' });

    const uid = req.user.id;
    const localPath = path.join(__dirname, '..', imageUrl);
    const results = {
      platformKey: normalizedPlatformKey,
      templateId,
      taskId: task.id,
    };

    const recognition = await recognizeProduct(localPath, req.user.id);
    results.recognition = recognition;

    const copyPrompt = buildCopyPromptPreview({
      productInfo: recognition,
      platformKey: normalizedPlatformKey,
      templateId,
      variables,
    });

    markTaskRunning(task.id, { progress_step: 'copy', progress_message: '正在生成平台内容' });
    const copy = await generateCopy(
      recognition,
      {
        style: copyStyle,
        platformKey: normalizedPlatformKey,
        templateId,
        variables,
        systemPrompt: copyPrompt.systemPrompt,
        userPrompt: copyPrompt.userPrompt,
      },
      req.user.id
    );
    results.copy = copy;

    const imagePrompt = buildImagePromptPreview({
      productInfo: recognition,
      copyResult: copy,
      platformKey: normalizedPlatformKey,
      templateId,
      variables,
    });

    markTaskRunning(task.id, { progress_step: 'image_submit', progress_message: '正在提交图片生成任务' });
    const imageJob = await submitImageEdit({
      imagePath: localPath,
      prompt: imagePrompt.userPrompt,
      size: imageSize || '2048x2048',
    }, req.user.id);
    results.imageJob = imageJob;

    deductPoints(uid, POINT_COST);

    const historyRecord = createHistory(uid, {
      original_image: imageUrl,
      recognition_result: recognition,
      copy_result: copy,
      generated_images: null,
      status: 'pending_image',
      job_id: imageJob.jobId,
      task_id: task.id,
      platform_key: normalizedPlatformKey,
      template_id: templateId,
      workflow_mode: 'one_click',
      prompt_snapshot_json: {
        copyPromptHidden: true,
        imagePromptHidden: true,
      },
      result_snapshot_json: {
        platformKey: normalizedPlatformKey,
        templateId,
      },
    });
    results.historyId = historyRecord.id;
    results.cost = POINT_COST;

    const waitingTask = markTaskWaitingExternal(task.id, {
      history_id: historyRecord.id,
      external_job_id: imageJob.jobId,
      prompt_snapshot_json: {
        copyPromptHidden: true,
        imagePromptHidden: true,
        platformKey: normalizedPlatformKey,
        templateId,
      },
      output_json: {
        recognition,
        copy,
        imageJob,
        historyId: historyRecord.id,
      },
      progress_message: '全链路已提交，等待外部图片任务完成',
    });

    res.json({ success: true, task: waitingTask, ...results });
  } catch (err) {
    console.error('[Workflow] Error:', err.message);
    markTaskFailed(task.id, err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/run-manual', authMiddleware.requirePoints(POINT_COST), authMiddleware.requirePermission('workflow.run'), async (req, res) => {
  const {
    imageUrl,
    platformKey = 'dewu',
    templateId = null,
    variables = {},
    copyPromptOverride = '',
    imagePromptOverride = '',
    imageSize,
  } = req.body;

  const normalizedPlatformKey = normalizePlatformKey(platformKey);
  const task = createQueuedTask({
    type: 'workflow_run',
    source: 'manual',
    user_id: req.user.id,
    platform_key: normalizedPlatformKey,
    template_id: templateId,
    input_json: req.body,
  });

  try {
    if (!imageUrl) return res.status(400).json({ error: '缺少 imageUrl 参数' });

    markTaskRunning(task.id, { progress_step: 'recognize', progress_message: '正在识别商品' });
    const localPath = path.join(__dirname, '..', imageUrl);
    const recognition = await recognizeProduct(localPath, req.user.id);

    const copyPrompt = buildCopyPromptPreview({
      productInfo: recognition,
      platformKey: normalizedPlatformKey,
      templateId,
      variables,
      promptOverride: copyPromptOverride,
    });

    markTaskRunning(task.id, { progress_step: 'copy', progress_message: '正在生成平台内容' });
    const copy = await generateCopy(recognition, {
      platformKey: normalizedPlatformKey,
      templateId,
      variables,
      systemPrompt: copyPrompt.systemPrompt,
      userPrompt: copyPrompt.userPrompt,
    }, req.user.id);

    const imagePrompt = buildImagePromptPreview({
      productInfo: recognition,
      copyResult: copy,
      platformKey: normalizedPlatformKey,
      templateId,
      variables,
      promptOverride: imagePromptOverride,
    });

    markTaskRunning(task.id, { progress_step: 'image_submit', progress_message: '正在提交图片生成任务' });
    const imageJob = await submitImageEdit({
      imagePath: localPath,
      prompt: imagePrompt.userPrompt,
      size: imageSize || '2048x2048',
    }, req.user.id);

    deductPoints(req.user.id, POINT_COST);

    const historyRecord = createHistory(req.user.id, {
      original_image: imageUrl,
      recognition_result: recognition,
      copy_result: copy,
      generated_images: null,
      status: 'pending_image',
      job_id: imageJob.jobId,
      task_id: task.id,
      platform_key: normalizedPlatformKey,
      template_id: templateId,
      workflow_mode: 'manual',
      prompt_snapshot_json: {
        copyPrompt,
        imagePrompt,
      },
      result_snapshot_json: {
        platformKey: normalizedPlatformKey,
        templateId,
      },
    });

    const waitingTask = markTaskWaitingExternal(task.id, {
      history_id: historyRecord.id,
      external_job_id: imageJob.jobId,
      prompt_snapshot_json: {
        copyPrompt,
        imagePrompt,
      },
      output_json: {
        recognition,
        copy,
        imageJob,
        historyId: historyRecord.id,
      },
      progress_message: '手动全链路已提交，等待外部图片任务完成',
    });

    res.json({
      success: true,
      task: waitingTask,
      historyId: historyRecord.id,
      recognition,
      copy,
      imageJob,
      cost: POINT_COST,
      platformKey: normalizedPlatformKey,
      templateId,
      prompt: {
        copyPrompt,
        imagePrompt,
      },
    });
  } catch (err) {
    markTaskFailed(task.id, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
