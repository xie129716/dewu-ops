const OpenAI = require('openai');
const { getSystemConfig } = require('./storage');

/**
 * Create a DeepSeek API client
 */
function createClient(userId) {
  const apiKey = process.env.DEEPSEEK_API_KEY || getSystemConfig('deepseek_api_key');
  if (!apiKey) {
    throw new Error('DeepSeek API Key 未配置，请先在设置页面配置');
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });
}

/**
 * Generate Dewu-style product copy
 * @param {object} productInfo - { brand, productName, category }
 * @param {object} options - { style, keywords }
 * @returns {object} - { title, content, tags, hashtags }
 */
const COPY_PROMPT = `你是一个得物（Dewu）App 社区的顶级潮流博主，擅长撰写吸引人的商品种草文案。你的文案风格：
- 年轻化、潮流化、有态度
- 善用emoji和网络热词
- 突出商品的独特卖点和穿搭/搭配场景
- 像朋友推荐一样真实、接地气
- 控制在200-400字之间

请严格按照以下JSON格式返回结果：
{
  "title": "帖子标题（吸引眼球，15字以内）",
  "content": "正文内容（200-400字，自然分段，适合得物社区风格）",
  "tags": ["标签1", "标签2", "标签3"],
  "hashtags": ["#话题1", "#话题2", "#话题3"]
}`;

function buildCopyMessages(productInfo, options = {}) {
  const { brand, productName, category } = productInfo;
  const { style = '潮流种草', keywords = '' } = options;
  return [
    { role: 'system', content: COPY_PROMPT },
    { role: 'user', content: `请为以下商品撰写得物风格的种草文案：

商品品牌：${brand}
商品名称：${productName}
商品品类：${category}
文案风格：${style}
${keywords ? `关键词：${keywords}` : ''}

请确保文案真实可信、有感染力，能够激发读者的购买欲望。` },
  ];
}

async function generateCopy(productInfo, options = {}, userId) {
  const completion = await createClient(userId).chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: buildCopyMessages(productInfo, options),
    reasoning_effort: 'high',
  });

  const rawContent = completion.choices[0].message.content;

  // Parse JSON from response
  let parsed;
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    parsed = {
      title: `${brand} ${productName}`,
      content: rawContent,
      tags: [brand, category],
      hashtags: [`#${brand}`, `#${category}`, '#得物种草'],
    };
  }

  return {
    title: parsed.title || `${brand} ${productName}`,
    content: parsed.content || rawContent,
    tags: parsed.tags || [],
    hashtags: parsed.hashtags || [],
  };
}

async function generateCopyStream(productInfo, options = {}) {
  return createClient().chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: buildCopyMessages(productInfo, options),
    reasoning_effort: 'high',
    stream: true,
  });
}

module.exports = { generateCopy, generateCopyStream };
