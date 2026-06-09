const express = require('express');
const path = require('path');
const router = express.Router();
const { recognizeProduct } = require('../services/bailian');
const { generateCopy } = require('../services/deepseek');
const { submitImageEdit } = require('../services/img65535');
const { createHistory } = require('../services/storage');

/**
 * Full pipeline: recognize → copy → generate image
 * Runs sequentially, returns intermediate results
 */
router.post('/run', async (req, res) => {
  try {
    const { imageUrl, copyStyle, imageSize } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: '缺少 imageUrl 参数' });
    }

    // Convert relative URL to absolute local file path for base64 encoding
    const localPath = path.join(__dirname, '..', imageUrl);
    const results = {};

    // Step 1: Recognize product (passes local path, service converts to base64)
    console.log('[Workflow] Step 1: Recognizing product...');
    const recognition = await recognizeProduct(localPath);
    results.recognition = recognition;
    console.log('[Workflow] Recognition result:', recognition.productName);

    // Step 2: Generate copy
    console.log('[Workflow] Step 2: Generating copy...');
    const copy = await generateCopy(
      {
        brand: recognition.brand,
        productName: recognition.productName,
        category: recognition.category,
      },
      { style: copyStyle }
    );
    results.copy = copy;
    console.log('[Workflow] Copy generated:', copy.title);

    // Step 3: Generate image using reference image (image-to-image / edits)
    console.log('[Workflow] Step 3: Submitting image-to-image generation task...');
    const imagePrompt = buildImagePrompt(recognition, copy);
    const imageJob = await submitImageEdit({
      imagePath: localPath,
      prompt: imagePrompt,
      size: imageSize || '2048x2048',
    });
    results.imageJob = imageJob;
    console.log('[Workflow] Image job submitted:', imageJob.jobId);

    // Save to history (include job_id for later sync)
    const historyRecord = createHistory({
      original_image: imageUrl,
      recognition_result: recognition,
      copy_result: copy,
      generated_images: null,
      status: 'pending_image',
      job_id: imageJob.jobId,
    });
    results.historyId = historyRecord.id;

    res.json({ success: true, ...results });
  } catch (err) {
    console.error('[Workflow] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

function buildImagePrompt(recognition, copy) {
  const { brand, productName, category } = recognition;
  const bg = pickBackground();
  return `参考图中是一个${brand} ${productName}（${category}）。保持图中商品主体的所有外观细节完全不变（包括颜色、材质纹理、logo、鞋型/包型轮廓、缝线等一切细节），仅将背景替换为${bg}。自然阳光从上方照射在商品上，呈现真实的光影效果和立体感。高清质感，画面干净高级，适合电商种草推广，得物App社区风格。`;
}

function pickBackground() {
  const backgrounds = [
    '一条干净的柏油马路路面，远处有模糊的街景',
    '一片翠绿的草地，有自然的光斑洒落',
    '一个安静的公园小径，周围有绿植和树木虚化',
    '纯色干净的电商摄影棚白色背景，专业产品摄影打光',
    '阳光明媚的沙滩，远处有海浪和天空',
  ];
  return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

module.exports = router;
