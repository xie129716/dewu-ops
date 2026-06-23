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

const LEGACY_COPY_PROMPT = `你是一个资深电商内容运营专家，擅长撰写真实自然、可直接发布的商品种草文案。你的文案要求：
- 年轻化、潮流化、有态度，但不能夸张失真
- 像真人运营或博主会写出来的内容，不要有 AI 味
- 严禁输出 Markdown 标记、标题符号、代码块、说明文字
- 不要输出类似 **、##、```、>、- 这类格式符号
- 语言自然、接地气、有传播感
- 突出商品卖点和实际使用场景
- 控制在200-400字之间

请严格按照以下 JSON 格式返回结果：
{
  "title": "帖子标题（吸引眼球，15字以内）",
  "content": "正文内容（200-400字，自然分段，适合真实运营发布）",
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

function stripMarkdownArtifacts(text = '') {
  return String(text)
    .replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeGeneratedValue(value, key = '') {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeGeneratedValue(item, key)).filter(Boolean);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeGeneratedValue(v, k)]));
  }
  if (typeof value === 'string') {
    if (key === 'hashtags' || key === 'keywords' || key === 'tags') {
      return value.trim();
    }
    return stripMarkdownArtifacts(value);
  }
  return value;
}

function normalizeGeneratedResult(rawContent, productInfo, options = {}) {
  const normalizedPlatformKey = normalizePlatformKey(options.platformKey || 'dewu');
  const fallback = getFallbackOutput(normalizedPlatformKey, productInfo);
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawContent.trim();
    const parsed = JSON.parse(jsonStr);
    return sanitizeGeneratedValue({ ...fallback, ...parsed });
  } catch (_) {
    if (normalizedPlatformKey === 'douyin') {
      return sanitizeGeneratedValue({
        ...fallback,
        caption: rawContent,
      });
    }
    if (normalizedPlatformKey === 'wechat_oa') {
      return sanitizeGeneratedValue({
        ...fallback,
        body: rawContent,
      });
    }
    return sanitizeGeneratedValue({
      ...fallback,
      content: rawContent,
    });
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
