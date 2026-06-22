const OpenAI = require('openai');
const { getSystemConfig } = require('./storage');
const { normalizePlatformKey, getFallbackOutput } = require('./platforms');
const { buildCopyPromptPreview } = require('./prompts');

function createClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || getSystemConfig('deepseek_api_key');
  if (!apiKey) {
    throw new Error('DeepSeek API Key 未配置，请先在设置页面配置');
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  });
}

const LEGACY_COPY_PROMPT = `你是一个得物（Dewu）App 社区的顶级潮流博主，擅长撰写吸引人的商品种草文案。你的文案风格：
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

function buildMessages(productInfo, options = {}) {
  if (options.systemPrompt && options.userPrompt) {
    return [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ];
  }

  const { brand, productName, category } = productInfo;
  const { style = '潮流种草', keywords = '' } = options;
  return [
    { role: 'system', content: LEGACY_COPY_PROMPT },
    { role: 'user', content: `请为以下商品撰写得物风格的种草文案：\n\n商品品牌：${brand}\n商品名称：${productName}\n商品品类：${category}\n文案风格：${style}\n${keywords ? `关键词：${keywords}` : ''}\n\n请确保文案真实可信、有感染力，能够激发读者的购买欲望。` },
  ];
}

function normalizeGeneratedResult(rawContent, productInfo, options = {}) {
  const normalizedPlatformKey = normalizePlatformKey(options.platformKey || 'dewu');
  const fallback = getFallbackOutput(normalizedPlatformKey, productInfo);
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
    const parsed = JSON.parse(jsonStr);
    return { ...fallback, ...parsed };
  } catch (_) {
    if (normalizedPlatformKey === 'douyin') {
      return {
        ...fallback,
        caption: rawContent,
      };
    }
    if (normalizedPlatformKey === 'wechat_oa') {
      return {
        ...fallback,
        body: rawContent,
      };
    }
    return {
      ...fallback,
      content: rawContent,
    };
  }
}

async function generateCopy(productInfo, options = {}) {
  const completion = await createClient().chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: buildMessages(productInfo, options),
    reasoning_effort: 'high',
  });

  const rawContent = completion.choices[0].message.content;
  const result = normalizeGeneratedResult(rawContent, productInfo, options);

  return {
    platformKey: normalizePlatformKey(options.platformKey || 'dewu'),
    templateId: options.templateId || null,
    prompt: options.systemPrompt || options.userPrompt ? {
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
    } : buildCopyPromptPreview({
      productInfo,
      platformKey: options.platformKey,
      templateId: options.templateId,
      variables: options.variables,
    }),
    ...result,
  };
}

async function generateCopyStream(productInfo, options = {}) {
  return createClient().chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: buildMessages(productInfo, options),
    reasoning_effort: 'high',
    stream: true,
  });
}

module.exports = { generateCopy, generateCopyStream };
