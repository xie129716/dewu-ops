const fs = require('fs');
const path = require('path');
const { getSetting } = require('./storage');

const BASE_URL = 'https://img-cn.65535.space';

function getApiKey(userId) {
  const apiKey = getSetting(userId, 'img65535_api_key');
  if (!apiKey) {
    throw new Error('65535 图片平台 API Key 未配置，请先在设置页面配置');
  }
  return apiKey;
}

/**
 * Submit a text-to-image generation task (no reference image)
 * POST /v1/images/generations (JSON)
 */
async function submitImageTask({ prompt, size = '2048x2048' }, userId) {
  const apiKey = getApiKey(userId);

  const body = { model: 'gpt-image-2', prompt, size, n: 1 };

  const response = await fetch(`${BASE_URL}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Async-Mode': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`65535 API 提交失败 (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  return {
    jobId: result.job_id,
    status: result.status || 'pending',
    statusUrl: result.status_url,
  };
}

/**
 * Submit an image-to-image (reference image) generation task
 * POST /v1/images/edits (multipart/form-data)
 * Uses native FormData + File API (Node.js 21+) for proper multipart encoding
 * @param {object} params
 * @param {string} params.imagePath - Absolute local path to the reference image
 * @param {string} params.prompt - Edit/generation prompt
 * @param {string} params.size - Output image size
 */
async function submitImageEdit({ imagePath, prompt, size = '2048x2048' }, userId) {
  const apiKey = getApiKey(userId);

  // Read image file into buffer
  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().replace('.', '');
  const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' };
  const mimeType = `image/${mimeMap[ext] || 'jpeg'}`;
  const filename = `reference.${mimeMap[ext] || 'jpg'}`;

  // Build multipart form using native FormData + File
  const form = new FormData();
  form.append('image', new File([imageBuffer], filename, { type: mimeType }));
  form.append('prompt', prompt);
  form.append('size', size);

  // Let fetch auto-set Content-Type (includes correct multipart boundary)
  const response = await fetch(`${BASE_URL}/v1/images/edits`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Async-Mode': 'true',
    },
    body: form,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`65535 Edits API 提交失败 (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  return {
    jobId: result.job_id,
    status: result.status || 'pending',
    statusUrl: result.status_url,
  };
}

/**
 * Poll for async task status (works for both generations and edits)
 * GET /v1/images/async-generations/{jobId}
 */
async function getTaskStatus(jobId, userId) {
  const apiKey = getApiKey(userId);

  const response = await fetch(`${BASE_URL}/v1/images/async-generations/${jobId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`查询任务状态失败 (${response.status}): ${errorBody}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`任务查询失败: ${result.message}`);
  }

  const data = result.data;
  return {
    jobId: data.job_id,
    status: data.status,
    resultUrls: data.result_urls || [],
    imageSizeTier: data.image_size_tier || '',
    costUsd: data.cost_usd || 0,
    errorCode: data.error_code || '',
    errorMessage: data.error_message || '',
    createdAt: data.created_at,
    finishedAt: data.finished_at,
  };
}

/**
 * Wait for task completion (polling)
 */
async function waitForCompletion(jobId, maxWaitMs = 300000, intervalMs = 2000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getTaskStatus(jobId);

    if (result.status === 'done') return result;
    if (result.status === 'failed') {
      throw new Error(`图片生成失败: ${result.errorMessage || '未知错误'} (${result.errorCode})`);
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('图片生成超时（超过5分钟），任务可能仍在后台执行，请稍后通过 jobId 查询');
}

module.exports = { submitImageTask, submitImageEdit, getTaskStatus, waitForCompletion };
