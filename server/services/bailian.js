const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { getSetting } = require('./storage');

/**
 * Create a Bailian (Alibaba Cloud) API client
 * Uses OpenAI-compatible interface with qwen-vl-max for vision tasks
 */
function createClient() {
  const apiKey = getSetting('bailian_api_key');
  if (!apiKey) {
    throw new Error('百炼 API Key 未配置，请先在设置页面配置');
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  });
}

/**
 * Convert a local image file to base64 data URL
 * @param {string} filePath - Absolute path to the image file
 * @returns {string} - data:image/xxx;base64,xxx
 */
function imageToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mimeMap = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp' };
  const mime = mimeMap[ext] || 'jpeg';
  return `data:image/${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Recognize product from image using qwen-vl-max
 * @param {string} imagePath - Local file path to the image, or base64 data URL
 * @returns {object} - { brand, productName, category, description, rawResponse }
 */
async function recognizeProduct(imagePath) {
  const client = createClient();

  const systemPrompt = `你是一个专业的潮流商品识别专家。请仔细分析图片中的商品，识别出商品的品牌、具体型号/款式、品类等信息。

请严格按照以下JSON格式返回结果（不要包含任何其他文字）：
{
  "brand": "品牌名称",
  "productName": "具体商品型号/名称",
  "category": "品类（如：运动鞋、板鞋、手提包、双肩包等）",
  "description": "商品特征的简短描述（颜色、材质、标志性元素等）",
  "confidence": "high/medium/low"
}

如果无法准确识别，请返回你最好的猜测，并在confidence字段标注为low。`;

  // Convert local file path to base64 data URL if not already a data URL
  const imageDataUrl = imagePath.startsWith('data:')
    ? imagePath
    : imageToBase64(imagePath);

  const completion = await client.chat.completions.create({
    model: 'qwen-vl-max',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: '请识别这张图片中的商品信息。' },
        ],
      },
    ],
  });

  const rawContent = completion.choices[0].message.content;

  // Parse JSON from response
  let parsed;
  try {
    // Extract JSON block if wrapped in markdown code fences
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    // Fallback: return raw content
    parsed = {
      brand: '未知',
      productName: '未能识别',
      category: '未知',
      description: rawContent,
      confidence: 'low',
    };
  }

  return {
    brand: parsed.brand || '未知',
    productName: parsed.productName || '未知商品',
    category: parsed.category || '未知品类',
    description: parsed.description || '',
    confidence: parsed.confidence || 'low',
    rawResponse: rawContent,
  };
}

module.exports = { recognizeProduct };
